# 架构说明

Login-example 是一个**纯前端静态站点 + Cloudflare Pages Functions 后端**的 OAuth 登录演示项目。没有传统服务器，服务端逻辑全部以 Pages Functions 的形式运行在 Cloudflare 边缘。

## 系统组成

```
浏览器
  │  ① 加载静态页面（Vite 构建产物 dist/）
  │  ② POST /verify         → Cloudflare Turnstile 人机校验
  │  ③ GET /auth/start/:p   → 跳转各平台授权页
  │  ④ 平台回调 /auth/*     → 换取 access_token，写入 HttpOnly Cookie
  │  ⑤ GET /api/:p/me       → 服务端代理请求平台用户信息
  ▼
Cloudflare Pages
  ├── 静态资源：dist/（首页、账号页、协议页、JS/CSS/i18n）
  └── Functions：functions/（鉴权、API 代理、重定向中间件）
```

- **前端**：`index.html`、`zh-cn/`、`zh-hant/`、`en-us/` 为各语言首页；`me/` 为登录后的账号页；`js/i18n.js` 负责文案与语言切换。
- **后端**：`functions/` 下的 `.ts` / `.js` 文件由 Wrangler 识别为路由，本地通过 `wrangler pages dev` 运行，线上由 Cloudflare Pages 托管。
- **本地桥**：`scripts/dsh-*.mjs` 是独立的 Node 进程（DSH 功能），仅监听 `127.0.0.1:8789`，见 [DSH-BRIDGE.md](DSH-BRIDGE.md)。

## 目录职责

| 路径 | 职责 |
|---|---|
| `index.html`、`{locale}/index.html` | 三语登录首页；包含 Turnstile 组件与登录按钮 |
| `me/{provider}/` | 各平台账号页及其前端脚本（拉取资料、退出登录） |
| `js/i18n.js` | 三语文案字典、DOM 文案替换、语言切换、语言链接 |
| `js/dsh-entry.js` | DeepSeek 本地桥入口探测与授权跳转 |
| `css/` | 全站样式；`css/me/style.css` 为账号页专用样式 |
| `i18n/legal/{locale}/` | 三语隐私政策与服务条款，协议页通过 `fetch` 动态加载 |
| `agreement/` | 早期版本的协议页与文本，现由中间件重定向到带语言前缀的路径 |
| `functions/_middleware.js` | 全局中间件：域名跳转、根路径语言选择、旧路径兼容重定向 |
| `functions/_lib/security.ts` | 安全工具：Cookie 读写、HMAC 签名/验签、PKCE、语言归一化 |
| `functions/verify.ts` | Turnstile 校验，签发短期会话 Cookie |
| `functions/auth/` | OAuth 发起（`start/[provider].ts`）与各平台回调 |
| `functions/api/` | 用户信息代理、退出登录、撤销授权 |
| `scripts/` | 本地开发、证书生成、环境校验、完整性检查、DSH 桥接 |
| `vite.config.mjs` | 多页入口收集、构建输出、HMR 与静态目录拷贝 |
| `dist/` | 构建产物（`emptyOutDir: true`），已加入 `.gitignore` |

## 构建流程

`npm run build` 执行 `vite build`，`vite.config.mjs` 做三件事：

1. 递归收集仓库内所有 `.html`（排除 `node_modules`、`.git`、`dist`、`.wrangler`）作为 Rollup 多页入口，输出到 `dist/`。
2. `copy-static-directories` 插件把 `js/`、`me/`、`css/`、`i18n/` 原样复制到 `dist/`——这些目录被前端直接引用或 `fetch`，不经过打包。
3. `useStableProfileStylesheet` 插件把 `/me/` 页面里带 hash 的产物样式链接替换为固定的 `/css/me/style.css`。

**生产构建强制要求 `VITE_TURNSTILE_SITE_KEY`**：`mode === 'production'` 且该变量为空时直接抛错，不会产出 `dist/`。开发模式（`--mode development`）不做此校验。

`npm run dev` 由 `scripts/dev.mjs` 编排：先跑一次 development 构建，再并行启动 Vite（HTTP `127.0.0.1:5173`）和 Wrangler（HTTPS `127.0.0.1:8788`，`--proxy 5173`）。Wrangler 负责 Functions 与静态资源，Vite 只负责前端 HMR；HMR 客户端被配置为通过 `wss://localhost:8788` 连接。

## 认证流程（以 GitHub 为例）

完整链路如下，其他平台结构相同：

1. **人机校验**：首页加载 Cloudflare Turnstile 组件（公钥 `%VITE_TURNSTILE_SITE_KEY%`）。用户通过后前端把 `cf-turnstile-response` POST 到 `/verify`。
2. **签发会话**：`/verify` 服务端调用 Turnstile `siteverify`，成功后用 `TURNSTILE_SESSION_SECRET`（缺省回退 `TURNSTILE_SECRET_KEY`）签发一个 5 分钟有效、HMAC-SHA256 签名的 `turnstile_session` Cookie。
3. **发起授权**：点击登录按钮跳 `/auth/start/github?locale=zh-cn`。该函数检查四种配置齐全、验证 `turnstile_session`，然后生成 `crypto.randomUUID()` 作为 `state`，连同 provider、locale、10 分钟过期时间一起签名写入 `oauth_state` Cookie，最后 302 到 GitHub 授权页。
4. **平台回调**：GitHub 带 `code` 和 `state` 回到 `GITHUB_REDIRECT_URI`（默认 `https://localhost:8788/auth/github`）。回调校验 `oauth_state` 中的 state 与 provider 后，用 code 换 access token，写入 7 天有效的 `token` Cookie，清除 `oauth_state` 与 `turnstile_session`，302 到账号页。
5. **读取资料**：账号页 `GET /api/github/me`，服务端读 `token` Cookie 代理请求 `api.github.com/user`，只返回精简字段给前端。
6. **退出**：`GET /api/github/exit` 清除浏览器上所有 Cookie；GitHub 另有 `/api/github/log_out`，会尝试调用 GitHub API 撤销 token（见 [已知问题](TROUBLESHOOTING.md#已知问题)）。

### OAuth 发起时的配置降级

`/auth/start/:provider` 不因缺少环境变量而抛异常：只要该 provider 的 `clientId`、`clientSecret`、`redirectUri` 或 Turnstile 密钥任一缺失，就 302 回首页并带 `?error=configuration&provider=xxx`；`turnstile_session` 无效则带 `?error=verification`。前端据此显示本地化提示。这让本地开发无需配置全部平台即可启动。

## 安全机制

实现集中在 `functions/_lib/security.ts`：

- **签名状态**：`signValue` 把 payload 做 base64url 编码后拼接 HMAC-SHA256 签名；`verifyValue` 校验签名并解析 `exp`，过期即视为无效。用于 `oauth_state` 与 `turnstile_session`，防止 state 伪造与会话篡改。
- **PKCE**：`generatePkce` 用 32 字节随机数生成 S256 verifier/challenge。目前仅 Qyxy 平台启用，其余平台使用标准 `state` 参数。
- **Cookie 属性**：签发的 Cookie 统一带 `HttpOnly; Secure; SameSite=Lax`。`Secure` 意味着本地也必须走 HTTPS（这正是本地开发需要证书的原因，见 [故障排查](TROUBLESHOOTING.md#https--证书问题)）。
- **回调校验**：各回调校验 state 一致、provider 匹配、code 存在；校验失败返回 `400 missing_code` 或 `401 no_token`。
- **重定向收敛**：`_middleware.js` 把 `login---example.pages.dev` 301 到正式域名；根路径按 `Accept-Language` 选择语言；旧的无前缀路径（`/me/github` 等）302 到带语言前缀的路径。

本项目定位为**演示**，不应作为生产身份验证服务直接使用。

## 多语言路由

支持 `zh-cn`、`zh-hant`、`en-us` 三种语言，路径即语言前缀：

- `/`、`/zh-cn/`、`/zh-hant/`、`/en-us/` 分别是自动选择与三个语言首页。
- 根路径 `/` 的语言判定（`requestLanguage`）：`zh-tw` / `zh-hk` / `zh-hant` → `zh-hant`；其他 `zh-*` → `zh-cn`；`en-*` → `en-us`；都无法匹配则 `en-us`。
- 平台回调写入的账号页路径由 `oauth_state` 中签名的 `locale` 决定，保证用户回到自己使用的语言。
- 法律文本由 `i18n/legal/{locale}/{privacy,terms}.md` 提供，协议页动态读取。`agreement/` 下的旧文本是历史版本。

`locale/` 目录当前为空，是遗留目录；实际语言资源在 `js/i18n.js` 与 `i18n/legal/`。
