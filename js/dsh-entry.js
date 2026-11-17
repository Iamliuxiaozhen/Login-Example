/**
 * DSH 入口:从首页/详情页点击后直接发起本机授权,在新标签页打开授权页。
 *
 * 用法:
 *   window.DshEntry.startSignIn(locale, returnTo)
 *     - locale   语言标识(zh-cn / zh-hant / en-us)
 *     - returnTo 授权完成后回跳的本地账号页绝对地址,可选
 *
 * 设计要点:
 *   - 新标签页必须在用户点击的同步调用栈里用 window.open('', '_blank') 打开,
 *     否则异步 await 之后再 open 会被浏览器弹窗拦截器拦截。
 *   - 公网环境不发起授权,直接跳到 /me/dsh/ 复用「请在本地尝试」降级提示。
 *   - 本地但未启动桥时,关闭预开的标签页并跳详情页给出提示。
 *   - token/code/state 全程不进入本脚本,只透传桥返回的 authorizeUrl。
 */
(function () {
  'use strict'

  const BRIDGE = 'http://127.0.0.1:8789'
  const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]']

  function copy() {
    return (window.AppI18n && window.AppI18n.t) || {}
  }

  function currentLocale() {
    return (window.AppI18n && window.AppI18n.locale) || 'zh-cn'
  }

  function isLocal() {
    return LOCAL_HOSTNAMES.includes(window.location.hostname)
  }

  async function pingBridge() {
    try {
      const response = await fetch(`${BRIDGE}/health`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      return response.ok && body.ok === true
    } catch {
      return false
    }
  }

  function showError(message) {
    // 首页用 #verifytext,详情页用 #dsh-status。
    const accountStatus = document.getElementById('dsh-status')
    if (accountStatus) {
      accountStatus.textContent = message
      return
    }
    const verifyText = document.getElementById('verifytext')
    if (verifyText) {
      verifyText.className = 'verify-status verify-status--error'
      verifyText.innerHTML = '<span class="status-icon" aria-hidden="true"></span><span></span>'
      const span = verifyText.querySelector('span:last-child')
      if (span) span.textContent = message
      return
    }
    window.alert(message)
  }

  /**
   * 发起本机授权。
   * @param {string} [locale] 语言标识
   * @param {string} [returnTo] 授权完成后的本地回跳地址
   */
  async function startSignIn(locale, returnTo) {
    const loc = locale || currentLocale()
    const accountUrl = returnTo || `${window.location.origin}/me/dsh/?locale=${encodeURIComponent(loc)}`
    const c = copy()

    // 公网环境:不发起授权,复用详情页的「仅本地」降级提示。
    if (!isLocal()) {
      window.location.href = `/me/dsh/?locale=${encodeURIComponent(loc)}`
      return
    }

    // 必须在点击的同步调用栈内开标签页,避免异步后被弹窗拦截。
    let tab = null
    try {
      tab = window.open('', '_blank')
    } catch {
      tab = null
    }

    if (!(await pingBridge())) {
      if (tab) tab.close()
      window.location.href = `/me/dsh/?locale=${encodeURIComponent(loc)}`
      return
    }

    try {
      const response = await fetch(`${BRIDGE}/api/login/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: loc, returnTo: accountUrl }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok || typeof result.authorizeUrl !== 'string') {
        throw new Error(result.message || 'login start failed')
      }
      if (tab) {
        tab.opener = null
        tab.location.replace(result.authorizeUrl)
      } else {
        // 浏览器拦截了弹窗:退回当前标签页跳转。
        window.location.href = result.authorizeUrl
      }
    } catch (error) {
      if (tab) tab.close()
      showError(c.dshLoginError || 'Could not start sign-in. Make sure the local bridge is running.')
    }
  }

  window.DshEntry = { startSignIn }
})()
