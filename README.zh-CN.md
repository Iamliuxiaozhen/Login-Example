# Login-example

这是一个登录演示项目，教你接入各平台（如 Google、Microsoft 和 GitHub）的登录，教程在 Wiki 里。您可在网页端体验。
[https://login-example.liuxiaozhen.dev/](https://login-example.liuxiaozhen.dev/)

## 各平台接入

| 平台 | 情况 | 教程 |
|---|---|---|
| GitHub | ✅ 已接入 | ⏳ 正在进行 |
| Microsoft | ✅ 已接入 | ⏳ 正在进行 |
| Google | ✅ 已接入 | ⏳ 正在进行 |
| X（Twitter） | 🗒︎ 正在计划 | 🗒︎ 正在计划 |
| Facebook | ⏹ 计划终止 | ⏹ 计划终止 |
| Apple | ⏹ 计划终止 | ⏹ 计划终止 |

> [!Important]
> 本仓库已于 2025 年 10 月 19 日公开。

## 重要声明

### 语言路径

网站提供简体中文、繁體中文和 English 三种语言：`/zh-cn`、`/zh-hant`、`/en-us`。访问根路径时会根据浏览器语言自动选择；旧的无语言前缀地址会兼容重定向。

部署 OAuth 登录前，请配置 `TURNSTILE_SECRET_KEY`、`TURNSTILE_SESSION_SECRET` 以及各平台的 OAuth 环境变量。`TURNSTILE_SESSION_SECRET` 用于签署短期验证和 OAuth 状态 Cookie，不应与前端代码或仓库共享。

本网站仅作为登录演示使用，不包含任何钓鱼内容。本网站及其后端代码均已开源，如有疑问可自行审查源代码。

**仓库地址：** [https://github.com/Iamliuxiaozhen/Login---Example](https://github.com/Iamliuxiaozhen/Login-Example)

## 本地开发（Vite)

1. 复制 `.env.example` 为 `.env`。
2. 在 `.env` 中填入本地 OAuth 凭据，并将回调地址指向 `https://localhost:8788`。
3. 运行 `npm install`。
4. 运行 `npm run dev`。
5. 打开 `https://localhost:8788/zh-cn/`、`https://localhost:8788/zh-hant/` 或 `https://localhost:8788/en-us/`。

开发命令会在 `5173` 启动 Vite，并在 HTTPS 端口 `8788` 启动 Wrangler Pages Functions。它不会因缺少环境变量而阻止启动：选择未配置的 OAuth 平台时，前端会显示本地化提示。部署前请使用 `npm run check:env` 验证完整配置。Vite 负责前端 HMR；Wrangler 负责 `/auth/*`、`/api/*` 和 `/verify`。

## Cloudflare Pages 构建

在仪表盘中设置 Build command 为 `npm run build`，Build output directory 为 `dist`。本仓库刻意不包含自动识别的 `wrangler.jsonc` Pages 构建配置，因此已有未配置构建命令的 Pages 项目会继续部署其配置的根目录，而不是因从未生成 `dist` 而构建失败。

## 环境变量

项目同时接受导出的 shell 变量和 `.env` 值。已导出的变量优先于从 `.env` 加载的值。不要提交 `.env`，以 `.env.example` 为模板。OAuth Client Secret 和签名密钥是仅服务端的变量，而 `VITE_TURNSTILE_SITE_KEY` 会暴露给浏览器。

© 2025 Login-example.

[服务协议](agreement/terms-service/text.md)
[隐私政策](agreement/PrivacyPolicy/text.md)

本作品采用 Apache License 开源。
