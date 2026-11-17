/**
 * 本地 DSH 桥的凭据读取与存储。
 *
 * 凭据来源优先级:
 *   1. 桥自己的本地存储(登录流程写入,不污染 DSH 凭据文件)
 *   2. DSH 自身的凭据文件 records['deepseek-account-platform/default']
 *
 * 安全约定:
 *   - token 只作为函数返回值在服务端内部流转,绝不打印、绝不进日志。
 *   - describeGrant() 只返回"是否已配置/来源",不含 token。
 *   - 桥存储文件以 0600 权限写入,且不放在项目目录内。
 *
 * 协议来源: deepseek-ai/deepseek-harness
 *   packages/credentials/deepseek-account/src/index.ts
 *   const KEY = credentialKey('deepseek-account-platform', 'default')
 *   commit({ kind: 'grant', payload: { version: 1, token, issuer } })
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'

const GRANT_RECORD = 'deepseek-account-platform/default'
const DEFAULT_PLATFORM_ORIGIN = 'https://platform.deepseek.com'

/**
 * 解析本项目所需的极简 YAML:仅支持「缩进映射 + 标量值」。
 * 不处理数组、锚点、多行标量等,这类结构在 DSH 凭据文件中不存在。
 * @param {string} text YAML 文本。
 * @returns {Record<string, unknown>} 解析后的嵌套对象。
 */
export function parseSimpleYaml(text) {
  const lines = text.split(/\r?\n/)
  const cursor = { index: 0 }

  function parseBlock(indent) {
    const result = {}
    while (cursor.index < lines.length) {
      const line = lines[cursor.index]
      const trimmed = line.trim()
      if (trimmed === '' || trimmed.startsWith('#')) {
        cursor.index += 1
        continue
      }
      const currentIndent = line.length - line.trimStart().length
      if (currentIndent < indent) break
      if (currentIndent > indent) {
        // 异常缩进(理论上不会出现),跳过该行而不是误挂到上一个键。
        cursor.index += 1
        continue
      }
      const matched = trimmed.match(/^([^:]+):(?:\s+(.*))?$/)
      if (!matched) {
        cursor.index += 1
        continue
      }
      const key = matched[1].trim()
      const value = matched[2]
      cursor.index += 1

      if (value !== undefined && value !== '') {
        result[key] = value.trim()
        continue
      }
      // 冒号后无值:若下一行缩进更深则递归解析子块,否则视为 null。
      const next = lines[cursor.index]
      if (next !== undefined) {
        const nextTrimmed = next.trim()
        const nextIndent = next.length - next.trimStart().length
        if (nextIndent > indent && nextTrimmed !== '' && !nextTrimmed.startsWith('#')) {
          result[key] = parseBlock(nextIndent)
          continue
        }
      }
      result[key] = null
    }
    return result
  }

  return parseBlock(0)
}

/** DSH 凭据文件路径,可用 DSH_HOME / DSH_CREDENTIALS_PATH 覆盖。 */
export function dshCredentialsPath() {
  if (process.env.DSH_CREDENTIALS_PATH) return process.env.DSH_CREDENTIALS_PATH
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, '.credentials.yaml')
}

/** 桥自己的凭据文件路径,放在用户主目录,不进项目 git。 */
export function bridgeCredentialsPath() {
  const home = process.env.DSH_BRIDGE_HOME || join(homedir(), '.login-example-dsh')
  return join(home, 'credentials.json')
}

/**
 * 校验并规范化一条 grant 记录。
 * @returns {{ token: string, issuer: string } | null} 非 grant / 格式错误返回 null。
 */
function normalizeGrant(record) {
  if (!record || record.kind !== 'grant') return null
  const payload = record.payload
  if (!payload || typeof payload !== 'object') return null
  const { version, token, issuer } = payload
  if (version !== '1' && version !== 1) return null
  if (typeof token !== 'string' || token.length === 0) return null
  if (typeof issuer !== 'string' || issuer.length === 0) return null
  return { token, issuer }
}

/** 从 DSH 凭据文件读取账号 grant(token 原值,仅服务端内部使用)。 */
export function readDshGrant() {
  const path = dshCredentialsPath()
  if (!existsSync(path)) return null
  let parsed
  try {
    parsed = parseSimpleYaml(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
  const records = parsed && typeof parsed.records === 'object' ? parsed.records : null
  return normalizeGrant(records ? records[GRANT_RECORD] : null)
}

/** 从桥本地存储读取账号 grant。 */
export function readBridgeGrant() {
  const path = bridgeCredentialsPath()
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    // 桥存储是扁平结构 { version, token, issuer },不像 DSH 凭据那样带 kind 包装。
    if (!parsed || typeof parsed !== 'object') return null
    const { version, token, issuer } = parsed
    if (version !== 1 && version !== '1') return null
    if (typeof token !== 'string' || token.length === 0) return null
    if (typeof issuer !== 'string' || issuer.length === 0) return null
    return { token, issuer }
  } catch {
    return null
  }
}

/**
 * 按优先级解析当前可用的账号 grant。
 * @returns {{ token: string, issuer: string, source: 'bridge' | 'dsh' } | null}
 */
export function resolveGrant() {
  const bridge = readBridgeGrant()
  if (bridge) return { ...bridge, source: 'bridge' }
  const dsh = readDshGrant()
  if (dsh) return { ...dsh, source: 'dsh' }
  return null
}

/**
 * 只返回可安全展示给前端的状态,不含 token。
 * @returns {{ configured: boolean, source?: 'bridge' | 'dsh', issuer?: string }}
 */
export function describeGrant() {
  const grant = resolveGrant()
  if (!grant) return { configured: false }
  return { configured: true, source: grant.source, issuer: grant.issuer }
}

/** 把登录流程换取的 token 存入桥自己的本地存储(0600)。 */
export function saveBridgeGrant(token, issuer = DEFAULT_PLATFORM_ORIGIN) {
  if (typeof token !== 'string' || token.length === 0) throw new Error('token 不能为空')
  const path = bridgeCredentialsPath()
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  writeFileSync(path, JSON.stringify({ version: 1, token, issuer }, null, 2), { mode: 0o600 })
  chmodSync(path, 0o600)
}

/** 清除桥本地存储中的 grant(不影响 DSH 凭据文件)。 */
export function clearBridgeGrant() {
  const path = bridgeCredentialsPath()
  if (existsSync(path)) unlinkSync(path)
}
