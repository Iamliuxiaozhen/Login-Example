/**
 * DeepSeek Platform 账号接口请求模块(本地桥服务端专用)。
 *
 * 协议逐字来源于 DSH 开源实现 deepseek-ai/deepseek-harness:
 *   packages/credentials/deepseek-account/src/client-metadata.ts  (五个客户端头)
 *   packages/credentials/deepseek-account/src/protocol.ts          (请求头合并/信封校验)
 *   packages/credentials/deepseek-account/src/details.ts           (接口路径/字段投影)
 *
 * 关键约束:除 x-dsh-auth-token 外必须带齐五个 x-client-* 头,否则返回 code 40003。
 * 响应为三层信封 { code, data: { biz_code, biz_data } },真实数据在 biz_data。
 */

import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_PLATFORM_ORIGIN = 'https://platform.deepseek.com'
const PATH_PROFILE = '/auth-api/v0/users/current'
const PATH_BALANCE = '/api/v0/users/get_user_summary'

/** token 被 Platform 拒绝(HTTP 401 或 code 40003)。 */
export class AccountUnauthorizedError extends Error {
  constructor() {
    super('账号授权已失效,请重新在本地登录')
    this.name = 'AccountUnauthorizedError'
  }
}

/** 响应格式不合法。 */
export class PlatformProtocolError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PlatformProtocolError'
  }
}

/**
 * 探测本机 DSH 包版本,作为 x-client-version 的值。
 * 可用 DSH_CLIENT_VERSION 覆盖;找不到时回退到默认值。
 */
export function resolveClientVersion() {
  if (process.env.DSH_CLIENT_VERSION) return process.env.DSH_CLIENT_VERSION
  const candidates = [
    join(homedir(), '.dsh', 'profiles', 'node_modules', '@deepseek-ai', 'dsh', 'package.json'),
    ...['1e7f6d9597241db0'].map(hash => join(
      homedir(), '.npm', '_npx', hash, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'
    )),
  ]
  for (const path of candidates) {
    if (!existsSync(path)) continue
    try {
      const pkg = JSON.parse(readFileSync(path, 'utf8'))
      if (typeof pkg.version === 'string' && pkg.version.length > 0) return pkg.version
    } catch {
      // 配置损坏的候选源跳过,继续找下一个。
    }
  }
  return '0.1.5-rc.1'
}

/**
 * 把 UI 语言归约为 Platform wire locale(源码 platformWireLocale)。
 * 只有主子标签为 zh 时返回 zh_CN,其余返回 en_US。
 */
export function platformWireLocale(locale) {
  return String(locale || '').toLowerCase().split(/[-_]/)[0] === 'zh' ? 'zh_CN' : 'en_US'
}

/**
 * 构造五个 Platform 客户端身份头(源码 platformClientHeaders)。
 * web 客户端固定 x-client-platform: web,bundle-id 有意留空。
 */
export function platformClientHeaders(client = {}) {
  const version = client.version || resolveClientVersion()
  const locale = client.locale || 'zh-CN'
  const timezoneOffsetSeconds = client.timezoneOffsetSeconds ?? (-new Date().getTimezoneOffset() * 60)
  return {
    'x-client-bundle-id': '',
    'x-client-platform': 'web',
    'x-client-version': version,
    'x-client-locale': platformWireLocale(locale),
    'x-client-timezone-offset': String(timezoneOffsetSeconds),
  }
}

/**
 * 合并账号请求头:客户端身份头 + 部署头 + provider 独占的 token 头(源码 accountHeaders)。
 * token 头由 provider 拥有,不允许部署配置覆盖。
 */
export function accountHeaders(token, client = {}, extraHeaders = {}) {
  if (typeof token !== 'string' || token.length === 0) throw new Error('token 不能为空')
  return {
    ...extraHeaders,
    ...platformClientHeaders(client),
    'x-dsh-auth-token': token,
  }
}

/**
 * 校验三层信封并返回 biz_data(源码 platformRequest 的 envelope + business-code 阶段)。
 * code 40003 或 HTTP 401 表示授权失效。
 */
export function unwrapEnvelope(payload, hasToken = true) {
  if (!payload || typeof payload !== 'object') throw new PlatformProtocolError('响应不是 JSON 对象')
  if (hasToken && payload.code === 40003) throw new AccountUnauthorizedError()
  if (payload.code !== 0) throw new PlatformProtocolError(`平台返回错误码 ${payload.code}`)
  const data = payload.data
  if (!data || typeof data !== 'object' || data.biz_code !== 0) {
    throw new PlatformProtocolError('平台业务码非 0')
  }
  return data.biz_data
}

/** 投影用户资料(源码 details.ts projectProfile)。 */
export function projectProfile(value) {
  if (!value || typeof value !== 'object') throw new PlatformProtocolError('用户资料格式错误')
  const identity = value.id_profile && typeof value.id_profile === 'object' ? value.id_profile : null
  return {
    id: typeof value.id === 'string' ? value.id : null,
    avatarUrl: (identity && identity.picture) || null,
    name: (identity && identity.name) || null,
    contact: value.mobile || value.mobile_number || value.email || null,
  }
}

/** 投影钱包余额:保留平台原始字符串,校验十进制文法(源码 details.ts wallet/schema)。 */
export function projectBalance(value) {
  if (!value || typeof value !== 'object') throw new PlatformProtocolError('余额响应格式错误')
  const decimal = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i
  const projectWallet = (list) => (Array.isArray(list) ? list : [])
    .filter(w => w && typeof w === 'object' && (w.currency === 'CNY' || w.currency === 'USD')
      && typeof w.balance === 'string' && decimal.test(w.balance))
    .map(w => ({ currency: w.currency, balance: w.balance }))
  return {
    wallets: projectWallet(value.normal_wallets),
    bonusWallets: projectWallet(value.bonus_wallets),
  }
}

/**
 * 向 Platform 发起一次已鉴权的只读 GET 请求。
 * @returns {Promise<unknown>} 已解封的 biz_data(调用方负责投影)。
 */
export async function requestAccount(path, token, client = {}, options = {}) {
  const origin = options.origin || DEFAULT_PLATFORM_ORIGIN
  const timeout = options.timeoutMs || 30000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(`${origin}${path}`, {
      method: 'GET',
      headers: accountHeaders(token, client, options.extraHeaders || {}),
      redirect: 'error',
      signal: controller.signal,
    })
    if (response.status === 401) throw new AccountUnauthorizedError()
    if (!response.ok) throw new PlatformProtocolError(`接口 HTTP ${response.status}`)
    let payload
    try {
      payload = JSON.parse(await response.text())
    } catch {
      throw new PlatformProtocolError('响应不是合法 JSON')
    }
    return unwrapEnvelope(payload, true)
  } finally {
    clearTimeout(timer)
  }
}

/** 读取账号资料(头像/昵称/脱敏手机号)。 */
export async function getProfile(token, client = {}, options = {}) {
  const data = await requestAccount(PATH_PROFILE, token, client, options)
  return projectProfile(data)
}

/** 读取充值余额与赠送余额。 */
export async function getBalance(token, client = {}, options = {}) {
  const data = await requestAccount(PATH_BALANCE, token, client, options)
  return projectBalance(data)
}
