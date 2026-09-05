(function () {
  const messages = {
    'en-us': {
      language: 'Language', home: 'Login Example', title: 'Login Example', github: 'GitHub', terms: 'Terms', privacy: 'Privacy',
      signIn: 'Sign in', chooseProvider: 'Choose a provider to continue.',
      githubLogin: 'Continue with GitHub', microsoftLogin: 'Continue with Microsoft', googleLogin: 'Continue with Google',
      securityCheck: 'Security check', completeCheck: 'Complete the check before signing in.',
      waiting: 'Waiting for verification', verifying: 'Verifying…', verified: 'Verification complete.',
      verificationFailed: 'Verification failed. Please try again.', expired: 'Verification expired. Please complete the check again.',
      protected: 'Protected by Cloudflare Turnstile', agreement: 'By continuing, you agree to the', and: 'and',
      demo: 'Demo', version: 'v1.0.0', turnstile: 'Turnstile enabled', intro: 'A minimal OAuth login demo for GitHub, Microsoft, and Google.',
      features: ['OAuth provider login', 'Cloudflare Turnstile verification', 'Lightweight frontend', 'No UI framework required'], repositories: 'Repositories', followers: 'Followers', following: 'Following',
      repository: 'View Login Example repository on GitHub', loading: 'Loading…', logout: 'Sign out', revoke: 'Revoke authorization',
      loadError: 'Unable to load account information.', logoutError: 'Unable to sign out. Please try again.',
      serverError: 'Something went wrong. Please try again.', pageNotFound: 'Page not found.'
    },
    'zh-cn': {
      language: '语言', home: 'Login Example', title: 'Login Example', github: 'GitHub', terms: '服务条款', privacy: '隐私政策',
      signIn: '登录', chooseProvider: '选择平台继续。',
      githubLogin: '使用 GitHub 登录', microsoftLogin: '使用 Microsoft 登录', googleLogin: '使用 Google 登录',
      securityCheck: '安全验证', completeCheck: '完成验证后再登录。',
      waiting: '等待验证', verifying: '正在验证……', verified: '验证完成。',
      verificationFailed: '验证失败，请重试。', expired: '验证已过期，请重新完成验证。',
      protected: '由 Cloudflare Turnstile 提供保护', agreement: '继续即表示您同意', and: '和',
      demo: '演示', version: 'v1.0.0', turnstile: '已启用 Turnstile', intro: '一个用于演示 GitHub、Microsoft 和 Google OAuth 登录的轻量项目。',
      features: ['OAuth 平台登录', 'Cloudflare Turnstile 验证', '轻量级前端', '无需 UI 框架'], repositories: '仓库', followers: '粉丝', following: '关注',
      repository: '在 GitHub 查看 Login Example 仓库', loading: '正在加载……', logout: '退出登录', revoke: '撤销授权',
      loadError: '无法加载账户信息。', logoutError: '退出登录失败，请重试。', serverError: '出现问题，请重试。', pageNotFound: '页面不存在。'
    },
    'zh-hant': {
      language: '語言', home: 'Login Example', title: 'Login Example', github: 'GitHub', terms: '服務條款', privacy: '隱私政策',
      signIn: '登入', chooseProvider: '選擇平台以繼續。',
      githubLogin: '使用 GitHub 登入', microsoftLogin: '使用 Microsoft 登入', googleLogin: '使用 Google 登入',
      securityCheck: '安全驗證', completeCheck: '完成驗證後再登入。',
      waiting: '等待驗證', verifying: '正在驗證……', verified: '驗證完成。',
      verificationFailed: '驗證失敗，請再試一次。', expired: '驗證已過期，請重新完成驗證。',
      protected: '由 Cloudflare Turnstile 提供保護', agreement: '繼續即表示您同意', and: '和',
      demo: '示範', version: 'v1.0.0', turnstile: '已啟用 Turnstile', intro: '一個用於示範 GitHub、Microsoft 與 Google OAuth 登入的輕量專案。',
      features: ['OAuth 平台登入', 'Cloudflare Turnstile 驗證', '輕量前端', '無需 UI 框架'], repositories: '儲存庫', followers: '追蹤者', following: '追蹤中',
      repository: '在 GitHub 查看 Login Example 儲存庫', loading: '載入中……', logout: '登出', revoke: '撤銷授權',
      loadError: '無法載入帳戶資訊。', logoutError: '登出失敗，請再試一次。', serverError: '發生問題，請再試一次。', pageNotFound: '找不到此頁面。'
    }
  };

  const locale = window.__LOCALE__ || document.documentElement.dataset.locale || 'en-us';
  const t = messages[locale] || messages['en-us'];
  document.documentElement.lang = locale === 'zh-cn' ? 'zh-CN' : locale === 'zh-hant' ? 'zh-Hant' : 'en-US';
  window.AppI18n = { locale, t, messages };
  document.title = t.title;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (key === 'feature') return;
    if (t[key] !== undefined) element.textContent = t[key];
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    if (t[key] !== undefined) element.setAttribute('aria-label', t[key]);
  });
  document.querySelectorAll('[data-i18n-list]').forEach((list) => {
    t.features.forEach((feature) => {
      const item = document.createElement('li');
      item.textContent = feature;
      list.appendChild(item);
    });
  });
  document.querySelectorAll('[data-locale-link]').forEach((link) => {
    const target = link.dataset.localeLink;
    link.href = `/${target}${location.pathname.replace(/^\/(zh-cn|zh-hant|en-us)(?=\/|$)/, '') || '/'}`.replace(/\/\/+/g, '/');
    link.textContent = target === 'zh-cn' ? '简中' : target === 'zh-hant' ? '繁中' : 'EN';
  });
  document.querySelectorAll('[data-localized-path]').forEach((link) => {
    link.href = `/${locale}${link.dataset.localizedPath}`;
  });
})();
