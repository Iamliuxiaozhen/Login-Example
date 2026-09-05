# Login-example

这是一个登录演示项目，教你接入各平台的登录，教程在Wiki里。您可用在网页端体验。
[https://login-example.liuxiaozhen.dev/](https://login-example.liuxiaozhen.dev/)

## 各平台接入
|平台|情况|教程|
|---|---|---|
|Github|✅已接入|⏳正在进行|
|Microsoft|✅已接入|⏳正在进行|
|Google|✅已接入|⏳正在进行|
|X（Twitter）|🗒︎正在计划|🗒︎正在计划|
|Facebook|⏹计划终止|⏹计划终止|
|Apple|⏹计划终止|⏹计划终止|

>[!Important]
>本仓库已于2025年10月19日公开。

## 重要声明

### 语言路径

网站提供简体中文、繁體中文和 English 三种语言：`/zh-cn`、`/zh-hant`、`/en-us`。访问根路径时会根据浏览器语言自动选择；旧的无语言前缀地址会兼容重定向。

部署 OAuth 登录前，请配置 `TURNSTILE_SECRET_KEY`、`TURNSTILE_SESSION_SECRET` 以及各平台的 OAuth 环境变量。`TURNSTILE_SESSION_SECRET` 用于签署短期验证和 OAuth 状态 Cookie，不应与前端代码或仓库共享。

本网站仅作为登录演示使用，不包含任何钓鱼内容。本网站及其后端代码均已开源，如有疑问可自行审查源代码。

**仓库地址：** [https://github.com/Iamliuxiaozhen/Login---Example](https://github.com/Iamliuxiaozhen/Login-Example)

---

## Important Notice

This website is for **OAuth login demonstration purposes only** and does **not** contain any phishing content.  
Both the frontend and backend code are **open-source**, and anyone may review the source code for verification.

**Repository:** [https://github.com/Iamliuxiaozhen/Login---Example](https://github.com/Iamliuxiaozhen/Login-Example)

© 2025 Login-example.
[服务协议](agreement/terms-service/text.md)
[隐私政策](agreement/PrivacyPolicy/text.md)  
本作品采用 Apache License开源

## Languages

The site is available at `/zh-cn`, `/zh-hant`, and `/en-us`. Visiting `/` selects a locale from the browser language and falls back to English.

For deployed OAuth and Turnstile flows, configure `TURNSTILE_SECRET_KEY`, `TURNSTILE_SESSION_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_REDIRECT_URI` as server-side secrets or variables. `TURNSTILE_SESSION_SECRET` should be a separate random value in production.

## Local development with Vite

1. Copy `.env.example` to `.env`.
2. Put local OAuth credentials and `https://localhost:8788` callback URLs in `.env`.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `https://localhost:8788/zh-cn/`, `https://localhost:8788/zh-hant/`, or `https://localhost:8788/en-us/`.

The development command starts Vite on `5173` and Wrangler Pages Functions on HTTPS port `8788`. It does not block startup for missing environment variables: selecting an unconfigured OAuth provider shows a localized message in the frontend. Use `npm run check:env` before deploying to validate the complete configuration. Vite handles frontend HMR; Wrangler handles `/auth/*`, `/api/*`, and `/verify`.

For Cloudflare Pages Git builds, set the dashboard Build command to `npm run build` and Build output directory to `dist`. The repository intentionally does not include an auto-detected `wrangler.jsonc` Pages build configuration, so an existing Pages project without a build command will continue deploying its configured root directory instead of failing because `dist` was never created.

The project accepts both exported shell variables and `.env` values. Existing exported variables win over values loaded from `.env`. Do not commit `.env`; use `.env.example` as the template. OAuth client secrets and signing keys are server-only variables, while `VITE_TURNSTILE_SITE_KEY` is intentionally exposed to the browser.
