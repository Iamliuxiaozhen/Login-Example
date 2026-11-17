/**
 * 本机回环浏览器登录流程(S256 PKCE)。
 *
 * 协议逐字来源于 DSH 开源实现 deepseek-ai/deepseek-harness:
 *   packages/credentials/deepseek-account/src/index.ts   (startSignIn / run)
 *   packages/credentials/deepseek-account/src/protocol.ts (requestPlatform / loginOrigin / browserUrl / exchange schema)
 *
 * 本模块只负责协议与会话状态,不监听 HTTP 端口;
 * 回调请求由本地桥服务(步骤4)收到后转交 validateCallback/completeSignIn 处理。
 * 所有 token / verifier / state / code 仅在内存中流转,不写入日志。
 */

import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto'
import { platform as osPlatform, arch, release } from 'node:os'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from 'node:fs'
import { dirname } from 'node:path'
import { platformClientHeaders, platformWireLocale, unwrapEnvelope } from './dsh-api.mjs'
import { saveBridgeGrant } from './dsh-credentials.mjs'

const DEFAULT_PLATFORM_ORIGIN = 'https://platform.deepseek.com'

/** 当前进行中的登录尝试(一次只允许一个,与 DSH 行为一致)。 */
let currentAttempt = null

function deviceOsVersion() {
  return `${osPlatform()} ${release()}`
}

function deviceStorePath() {
  return join(process.env.DSH_BRIDGE_HOME || join(homedir(), '.login-example-dsh'), 'device.json')
}

/** 读取或创建稳定的设备 ID(独立于账号 token)。 */
function getDeviceId() {
  const path = deviceStorePath()
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8'))
      if (typeof parsed.id === 'string' && parsed.id.length > 0) return parsed.id
    } catch {
      // 损坏则重建,设备 ID 不具机密性。
    }
  }
  const id = randomUUID()
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  writeFileSync(path, JSON.stringify({ id }), { mode: 0o600 })
  chmodSync(path, 0o600)
  return id
}

/**
 * 校验本机回调来源(源码 loginOrigin):仅接受带显式端口的 loopback HTTP。
 * @returns {string} 规范化后的 origin(无尾斜杠)。
 */
export function validateCallbackOrigin(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('回调地址必须是带端口的本机 HTTP 地址')
  }
  const matched = /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):([0-9]+)\/?$/i.exec(value)
  if (!matched || Number(matched[1]) === 0 || url.protocol !== 'http:'
      || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('回调地址仅支持带显式端口的 localhost / 127.0.0.1 / [::1] HTTP 地址')
  }
  return `${url.protocol}//${url.hostname}:${Number(matched[1])}`
}

/** 校验浏览器跳转地址(源码 browserUrl):同源 + 固定路径。 */
function validateBrowserUrl(value, origin, path) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('平台返回的浏览器地址无效')
  }
  if (url.origin !== origin || url.pathname !== path || url.username || url.password || url.hash) {
    throw new Error('平台返回的浏览器地址不符合预期')
  }
  return url.href
}

/**
 * 调用 Platform 的 /auth-api/v0/dsh/{method} 协议端点。
 * 这些调用在登录前发生,只带五个客户端头,不带账号 token。
 */
async function protocolRequest(method, body, client, options = {}) {
  const origin = options.origin || DEFAULT_PLATFORM_ORIGIN
  const timeout = options.timeoutMs || 30000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(`${origin}/auth-api/v0/dsh/${method}`, {
      method: 'POST',
      headers: { ...platformClientHeaders(client), 'content-type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`auth_${method} HTTP ${response.status}`)
    let payload
    try {
      payload = JSON.parse(await response.text())
    } catch {
      throw new Error(`auth_${method} 响应不是合法 JSON`)
    }
    return unwrapEnvelope(payload, false)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 发起登录:生成 PKCE 参数并调用 auth_init。
 * @returns {{ sessionId: string, authorizeUrl: string, expiresAt: number, callbackOrigin: string }}
 */
export async function beginSignIn(callbackOriginInput, client = {}, options = {}) {
  if (currentAttempt && Date.now() < currentAttempt.expiresAt) {
    return {
      sessionId: currentAttempt.id,
      authorizeUrl: currentAttempt.authorizeUrl,
      expiresAt: currentAttempt.expiresAt,
      callbackOrigin: currentAttempt.callbackOrigin,
    }
  }
  const callbackOrigin = validateCallbackOrigin(callbackOriginInput)
  const origin = options.origin || DEFAULT_PLATFORM_ORIGIN
  const locale = platformWireLocale(client.locale || 'zh-CN')
  const headersClient = { ...client, locale }

  const verifier = randomBytes(32).toString('base64url')
  const state = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const redirectUri = `${callbackOrigin}/oauth/callback`

  const init = await protocolRequest('auth_init', {
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    redirect_uri: redirectUri,
    locale,
    login_source: 'web',
  }, headersClient, options)

  if (typeof init.authorize_url !== 'string' || typeof init.authorize_id !== 'string'
      || typeof init.expires_in !== 'number' || init.expires_in <= 0) {
    throw new Error('auth_init 响应缺少必要字段')
  }
  const authorizeUrl = validateBrowserUrl(init.authorize_url, origin, '/dsh/authorize')

  currentAttempt = {
    id: randomUUID(),
    verifier,
    state,
    redirectUri,
    authorizeUrl,
    authorizeId: init.authorize_id,
    expiresAt: Date.now() + init.expires_in * 1000,
    callbackOrigin,
    client: headersClient,
    origin,
  }
  return {
    sessionId: currentAttempt.id,
    authorizeUrl,
    expiresAt: currentAttempt.expiresAt,
    callbackOrigin,
  }
}

/**
 * 校验回跳请求(源码 webserver/request 监听器)。
 * @param {object} req URL 解析结果 { origin, pathname, method, searchParams }
 * @returns {{ code: string }} 校验通过时返回授权码。
 */
export function validateCallback(req) {
  const attempt = currentAttempt
  if (!attempt) throw new Error('没有进行中的登录')
  if (req.origin !== attempt.callbackOrigin || req.pathname !== '/oauth/callback') {
    throw new Error('回调地址不匹配')
  }
  if (Date.now() >= attempt.expiresAt) throw new Error('登录已过期')
  const receivedCode = req.searchParams.get('code')
  const receivedState = req.searchParams.get('state') ?? ''
  const validState = Buffer.byteLength(receivedState) === Buffer.byteLength(attempt.state)
    && timingSafeEqual(Buffer.from(receivedState), Buffer.from(attempt.state))
  if (req.method !== 'GET' || !validState || !receivedCode
      || req.searchParams.getAll('state').length !== 1 || req.searchParams.getAll('code').length !== 1) {
    throw new Error('回调参数校验失败')
  }
  return { code: receivedCode }
}

/**
 * 用授权码兑换 token,存入桥本地存储(不触碰 DSH 凭据文件)。
 * @returns {{ authorizedUrl: string, profile: object | null }}
 */
export async function completeSignIn(options = {}) {
  const attempt = currentAttempt
  if (!attempt) throw new Error('没有进行中的登录')
  const result = await protocolRequest('auth_exchange', {
    code: attempt.code,
    code_verifier: attempt.verifier,
    redirect_uri: attempt.redirectUri,
    device_id: getDeviceId(),
    device_model: `${osPlatform()}-${arch()}`,
    os_version: deviceOsVersion(),
  }, attempt.client, options)

  if (typeof result.token !== 'string' || result.token.length === 0 || typeof result.authorized_url !== 'string') {
    throw new Error('auth_exchange 响应缺少必要字段')
  }
  const authorizedUrl = validateBrowserUrl(result.authorized_url, attempt.origin, '/dsh/authorized')
  saveBridgeGrant(result.token, attempt.origin)
  currentAttempt = null
  return { authorizedUrl, profile: result.user ?? null }
}

/** 把校验通过的 code 挂到当前会话(供 completeSignIn 使用)。 */
export function attachCode(code) {
  if (!currentAttempt) throw new Error('没有进行中的登录')
  currentAttempt.code = code
}
