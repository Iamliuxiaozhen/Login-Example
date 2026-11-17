(function () {
  'use strict'

  const t = (window.AppI18n && window.AppI18n.t) || {}
  const BRIDGE_PORT = 8789
  const BRIDGE = `http://127.0.0.1:${BRIDGE_PORT}`

  const els = {
    avatar: document.getElementById('dsh-avatar'),
    name: document.getElementById('dsh-name'),
    contact: document.getElementById('dsh-contact'),
    balance: document.getElementById('dsh-balance'),
    bonus: document.getElementById('dsh-bonus'),
    status: document.getElementById('dsh-status'),
    signin: document.getElementById('dsh-signin'),
    logout: document.getElementById('dsh-logout'),
    localOnly: document.getElementById('dsh-local-only'),
    hint: document.getElementById('dsh-hint'),
  }

  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
  let localBridgeAvailable = false

  function setStatus(message) {
    els.status.textContent = message || ''
  }

  function showLocalOnly() {
    els.localOnly.classList.remove('dsh-hidden')
    els.signin.disabled = true
    els.logout.disabled = true
    setStatus(t.dshLocalOnlyStatus || '当前不是本地环境。')
  }

  function showHint(message) {
    els.hint.textContent = message || (t.dshHint || '')
    els.hint.classList.remove('dsh-hidden')
  }

  function clearProfile() {
    els.avatar.removeAttribute('src')
    els.name.textContent = t.loading || 'Loading…'
    els.contact.textContent = ''
    els.balance.textContent = '—'
    els.bonus.textContent = '—'
  }

  function formatWallets(wallets) {
    if (!Array.isArray(wallets) || wallets.length === 0) return '—'
    return wallets.map(w => `${w.currency} ${w.balance}`).join(' · ')
  }

  function renderProfile(profile) {
    if (profile.avatarUrl) {
      els.avatar.src = profile.avatarUrl
    } else {
      els.avatar.removeAttribute('src')
    }
    els.name.textContent = profile.name || (t.dshAnonymous || 'DeepSeek user')
    els.contact.textContent = profile.contact || ''
  }

  function renderBalance(balance) {
    els.balance.textContent = formatWallets(balance && balance.wallets)
    els.bonus.textContent = formatWallets(balance && balance.bonusWallets)
  }

  async function bridgeFetch(path, options) {
    const response = await fetch(`${BRIDGE}${path}`, Object.assign({ cache: 'no-store' }, options || {}))
    return response.json().catch(() => ({}))
  }

  async function loadAccount() {
    clearProfile()
    try {
      const status = await bridgeFetch('/api/status')
      if (!status.ok || !status.configured) {
        setStatus(t.dshNotAuthorized || '尚未授权 DeepSeek 账号。')
        els.signin.disabled = false
        els.logout.disabled = true
        showHint()
        return
      }
      els.signin.disabled = true
      els.logout.disabled = false
      setStatus('')
      els.hint.classList.add('dsh-hidden')

      const [profileResult, balanceResult] = await Promise.all([
        bridgeFetch('/api/profile'),
        bridgeFetch('/api/balance'),
      ])
      if (profileResult.ok && profileResult.profile) renderProfile(profileResult.profile)
      if (balanceResult.ok && balanceResult.balance) renderBalance(balanceResult.balance)
      if (profileResult.error === 'unauthorized' || balanceResult.error === 'unauthorized') {
        setStatus(t.dshSessionExpired || '账号授权已失效,请重新登录。')
        els.signin.disabled = false
      }
    } catch (error) {
      setStatus(t.dshLoadError || '无法加载账号信息。')
      els.signin.disabled = true
    }
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

  els.signin.addEventListener('click', function () {
    const locale = (window.AppI18n && window.AppI18n.locale) || 'zh-cn'
    const returnTo = `${window.location.origin}/me/dsh/?locale=${encodeURIComponent(locale)}`
    els.signin.disabled = true
    setStatus(t.dshOpeningBrowser || '正在打开浏览器完成授权……')
    window.DshEntry.startSignIn(locale, returnTo)
  })

  els.logout.addEventListener('click', async function () {
    els.logout.disabled = true
    try {
      await bridgeFetch('/api/logout', { method: 'POST' })
      setStatus(t.dshSignedOut || '已清除本地授权。')
      await loadAccount()
    } catch (error) {
      setStatus(t.dshLogoutError || '退出失败,请重试。')
      els.logout.disabled = false
    }
  })

  async function init() {
    if (!isLocal) {
      showLocalOnly()
      return
    }
    localBridgeAvailable = await pingBridge()
    if (!localBridgeAvailable) {
      setStatus(t.dshBridgeOffline || '未检测到本地桥接服务。')
      els.signin.disabled = true
      els.logout.disabled = true
      showHint()
      return
    }
    await loadAccount()
  }

  init()
})()
