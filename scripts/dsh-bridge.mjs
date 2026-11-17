/**
 * 本地 DSH 桥服务(仅监听 127.0.0.1)。
 *
 * 启动: node scripts/dsh-bridge.mjs
 * 默认端口 8789,可用 DSH_BRIDGE_PORT 覆盖。
 *
 * 端点:
 *   GET  /health            存活探测(前端判断本地桥是否可用)
 *   GET  /api/status        账号授权状态(不含 token)
 *   GET  /api/profile       头像 / 昵称 / 脱敏联系方式
 *   GET  /api/balance       充值余额 / 赠送余额
 *   POST /api/login/start   发起本机浏览器登录
 *   POST /api/logout        清除桥本地授权
 *   GET  /oauth/callback    PKCE 登录回调(仅本机,严格校验)
 *
 * 安全:只绑回环地址;CORS 白名单;响应不含 token;日志只打印路径与状态码。
 */

import { createServer } from 'node:http'
import { describeGrant, resolveGrant, clearBridgeGrant } from './dsh-credentials.mjs'
import { getProfile, getBalance, AccountUnauthorizedError } from './dsh-api.mjs'
import {
  beginSignIn, validateCallback, attachCode, completeSignIn, validateCallbackOrigin,
} from './dsh-signin.mjs'

const PORT = Number(process.env.DSH_BRIDGE_PORT || 8789)
const HOST = '127.0.0.1'
const ALLOWED_ORIGINS = new Set([
  'http://localhost:8788', 'https://localhost:8788',
  'http://127.0.0.1:8788', 'https://127.0.0.1:8788',
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:4173', 'http://127.0.0.1:4173',
])

/** 只输出路径与状态码,绝不输出 token / code / 请求体。 */
function log(method, path, status) {
  console.log(`[dsh-bridge] ${method} ${path} -> ${status}`)
}

function send(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  })
  res.end(payload)
}

function corsHeaders(req) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      vary: 'Origin',
    }
  }
  return {}
}

function readJson(body) {
  return new Promise((resolve, reject) => {
    let raw = ''
    body.setEncoding('utf8')
    body.on('data', chunk => {
      raw += chunk
      if (raw.length > 8192) reject(new Error('请求体过大'))
    })
    body.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('请求体不是合法 JSON'))
      }
    })
    body.on('error', reject)
  })
}

/** 从凭据解析账号信息;未配置或已失效时返回可展示的错误,不抛 token。 */
async function withGrant(handler, res, meta) {
  const grant = resolveGrant()
  if (!grant) {
    const status = 401
    send(res, status, { ok: false, error: 'not_configured' }, corsHeaders(meta.req))
    log(meta.method, meta.pathname, status)
    return
  }
  try {
    const data = await handler(grant.token)
    send(res, 200, { ok: true, ...data }, corsHeaders(meta.req))
    log(meta.method, meta.pathname, 200)
  } catch (error) {
    if (error instanceof AccountUnauthorizedError) {
      send(res, 401, { ok: false, error: 'unauthorized' }, corsHeaders(meta.req))
      log(meta.method, meta.pathname, 401)
      return
    }
    const status = 502
    send(res, status, { ok: false, error: 'upstream_failed' }, corsHeaders(meta.req))
    console.error(`[dsh-bridge] ${meta.method} ${meta.pathname} upstream failure:`, error.message)
    log(meta.method, meta.pathname, status)
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`)
  const pathname = url.pathname
  const meta = { req, method: req.method, pathname }

  // 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...corsHeaders(req), 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' })
    res.end()
    log(req.method, pathname, 204)
    return
  }

  // PKCE 回调:只接受本机来源、精确路径、严格 state/code 校验。
  if (pathname === '/oauth/callback') {
    try {
      const callbackOrigin = validateCallbackOrigin(`http://${req.headers.host || `${HOST}:${PORT}`}`)
      const { code } = validateCallback({
        origin: callbackOrigin,
        pathname,
        method: req.method,
        searchParams: url.searchParams,
      })
      attachCode(code)
      const { authorizedUrl, returnTo } = await completeSignIn()
      // 有合法的本地回跳地址则回本地账号页,否则兼容旧行为跳平台完成页。
      const location = returnTo || authorizedUrl
      res.writeHead(302, { location, 'cache-control': 'no-store' })
      res.end()
      log(req.method, pathname, 302)
    } catch (error) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
      res.end('回调校验失败,请重新发起登录')
      console.error('[dsh-bridge] callback rejected:', error.message)
      log(req.method, pathname, 400)
    }
    return
  }

  if (pathname === '/health' && req.method === 'GET') {
    send(res, 200, { ok: true, service: 'dsh-bridge' }, corsHeaders(req))
    log(req.method, pathname, 200)
    return
  }

  if (pathname === '/api/status' && req.method === 'GET') {
    send(res, 200, { ok: true, ...describeGrant() }, corsHeaders(req))
    log(req.method, pathname, 200)
    return
  }

  if (pathname === '/api/profile' && req.method === 'GET') {
    await withGrant(token => getProfile(token, {}, {}).then(profile => ({ profile })), res, meta)
    return
  }

  if (pathname === '/api/balance' && req.method === 'GET') {
    await withGrant(token => getBalance(token, {}, {}).then(balance => ({ balance })), res, meta)
    return
  }

  if (pathname === '/api/login/start' && req.method === 'POST') {
    try {
      const body = await readJson(req)
      const callbackOrigin = `http://${req.headers.host || `${HOST}:${PORT}`}`
      const result = await beginSignIn(callbackOrigin, { locale: body.locale || 'zh-CN' }, { returnTo: body.returnTo })
      send(res, 200, { ok: true, ...result }, corsHeaders(req))
      log(req.method, pathname, 200)
    } catch (error) {
      const status = 400
      send(res, status, { ok: false, error: 'login_start_failed', message: error.message }, corsHeaders(req))
      console.error('[dsh-bridge] login start failed:', error.message)
      log(req.method, pathname, status)
    }
    return
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    try {
      clearBridgeGrant()
      send(res, 200, { ok: true }, corsHeaders(req))
      log(req.method, pathname, 200)
    } catch (error) {
      const status = 500
      send(res, status, { ok: false, error: 'logout_failed' }, corsHeaders(req))
      console.error('[dsh-bridge] logout failed:', error.message)
      log(req.method, pathname, status)
    }
    return
  }

  send(res, 404, { ok: false, error: 'not_found' }, corsHeaders(req))
  log(req.method, pathname, 404)
})

server.listen(PORT, HOST, () => {
  console.log(`[dsh-bridge] 本地桥已启动: http://${HOST}:${PORT}`)
  console.log('[dsh-bridge] 仅本机可访问,token 不会离开本机。')
})
