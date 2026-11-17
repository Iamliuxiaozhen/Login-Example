# API 参考

后端全部由 Cloudflare Pages Functions 实现（`functions/` 目录）。本地开发时由 Wrangler 在 HTTPS 端口 `8788` 提供，线上由 Cloudflare Pages 提供。

> 端点路径大小写敏感。Google 回调是 `/auth/Google/`（首字母大写、带尾斜杠），与 `GOOGLE_REDIRECT_URI` 默认值一致。

## 中间件重定向（`functions/_middleware.js`）

对所有请求生效，命中后直接返回重定向，不再进入后续路由。

| 触发条件 | 行为 |
|---|---|
| Host 为 `login---example.pages.dev` | 301 到 `https://login-example.liuxiaozhen.dev` + 原路径与查询串 |
| 路径为 `/` | 302 到 `/{locale}/`，语言由 `Accept-Language` 判定（默认 `en-us`） |
| 旧路径 `/me/github`、`/me/google`、`/me/microsoft`、`/me/qyxy`、`/agreement/terms-service`、`/agreement/PrivacyPolicy` | 302 到 `/{locale}/` + 对应路径 |

## 验证：`POST /verify`（`functions/verify.ts`）

首页 Turnstile 校验通过后调用。

- **请求体**：`application/x-www-form-urlencoded` 或 `multipart/form-data`，字段 `cf-turnstile-response`（Turnstile token）。
- **成功**：`200 {"success": true}`，并下发 `Set-Cookie: turnstile_session=<签名值>`（HttpOnly / Secure / SameSite=Lax，有效期 300 秒）。
- **失败**：

| 状态码 | `error` | 含义 |
|---|---|---|
| 400 | `missing_token` | 未提交 token |
| 403 | `error-codes` 数组 | Turnstile 判定失败，原样返回其错误码 |
| 500 | `missing_secret` | 服务端未配置 `TURNSTILE_SECRET_KEY` |
| 502 | `verification_unavailable` | Turnstile `siteverify` 接口不可用 |

服务端用 `TURNSTILE_SECRET_KEY` 调用 `https://challenges.cloudflare.com/turnstile/v0/siteverify`；会话 Cookie 用 `TURNSTILE_SESSION_SECRET || TURNSTILE_SECRET_KEY` 签名。

## 发起登录：`GET /auth/start/:provider`（`functions/auth/start/[provider].ts`）

`:provider` 支持 `github`、`microsoft`、`google`、`qyxy`；其他值返回 `404 Unknown provider`。

- **查询参数**：`locale`（可选，需为 `zh-cn` / `zh-hant` / `en-us`，否则按 `en-us` 处理）。
- **前置条件**：对应 provider 的 clientId / clientSecret / redirectUri 齐全，且 `TURNSTILE_SECRET_KEY` 与会话密钥存在；`turnstile_session` Cookie 有效。
- **成功**：写 `oauth_state` Cookie（签名 state，600 秒），302 到平台授权页。

各平台授权 URL 与 scope：

| provider | 授权端点 | scope / 特性 |
|---|---|---|
| `github` | `github.com/login/oauth/authorize` | 仅 `state` |
| `microsoft` | `login.microsoftonline.com/consumers/oauth2/v2.0/authorize` | `openid profile email User.Read`，`prompt=consent` |
| `google` | `accounts.google.com/o/oauth2/v2/auth` | `openid email profile` |
| `qyxy` | `${QYXY_AUTH_URL}/authorize.php` | `scope=userinfo`，启用 PKCE S256 |

- **失败**：302 回 `/{locale}/?error=configuration&provider=xxx`（配置缺失）或 `/{locale}/?error=verification`（会话无效）。

## OAuth 回调

四个平台各有一个回调路由，`code` 换 token 成功后写 `token` Cookie、清除 `oauth_state` 与 `turnstile_session`，再 302 到 `/{locale}/me/{provider}/`。

| provider | 路径 | 源文件 | token 交换端点 |
|---|---|---|---|
| GitHub | `GET /auth/github` | `functions/auth/github.ts` | `github.com/login/oauth/access_token` |
| Google | `GET /auth/Google/` | `functions/auth/Google.ts` | `oauth2.googleapis.com/token` |
| Microsoft | `GET /auth/microsoft` | `functions/auth/microsoft.ts` | `login.microsoftonline.com/consumers/oauth2/v2.0/token` |
| Qyxy（青云学研） | `GET /auth/` | `functions/auth/index.ts` | `${QYXY_AUTH_URL}/api/token.php`（带 `code_verifier`） |

回调通用错误：

| 状态码 | `error` | 含义 |
|---|---|---|
| 400 | `missing_code` | 缺 code、state 校验失败或 provider 不匹配 |
| 401 | `no_token` | token 交换未返回可用 token（响应体含 `detail`） |
| 500 | `server_error` | 未捕获异常，含 `message` |

Google 回调会解析 ID Token 的 JWT payload，但仅用于校验 token 存在，账号页资料仍由 `/api/google/me` 获取。

## 用户信息：`GET /api/:provider/me`（`functions/api/{provider}/me.ts`）

读取 `token` Cookie，服务端代理请求平台用户信息接口，返回精简、脱敏后的字段。无 token 时返回错误（具体状态码以各实现为准，通常为 `401`）。

| provider | 上游接口 |
|---|---|
| `github` | `api.github.com/user` |
| `google` | `googleapis.com/oauth2/v2/userinfo` |
| `microsoft` | `graph.microsoft.com/v1.0/me` |
| `qyxy` | `${QYXY_AUTH_URL}/api/userinfo.php` |

## 退出登录

| 方法 | 路径 | 行为 |
|---|---|---|
| ANY | `/api/{provider}/exit`（github / google / microsoft / qyxy） | 清除请求携带的所有 Cookie（含 `Domain` 变体），返回 `200 {"status":"ok"}` |
| ANY | `/api/qyxy/exit` | 先调用 `${QYXY_AUTH_URL}/api/revoke.php` 撤销 token，再清 Cookie |
| ANY | `/api/github/log_out` | 尝试调用 `DELETE api.github.com/applications/{clientId}/token` 撤销授权，再清 Cookie（见 [已知问题](TROUBLESHOOTING.md#已知问题)） |

## 本地 DSH 桥接端点

`npm run dev:dsh` 启动的独立 HTTP 服务，默认 `http://127.0.0.1:8789`，仅绑定回环地址，不属于 Pages Functions。端点表见 [DSH-BRIDGE.md](DSH-BRIDGE.md#端点)。

## Cookie 一览

| Cookie | 签发方 | 有效期 | 内容 |
|---|---|---|---|
| `turnstile_session` | `/verify` | 300 秒 | 签名的校验会话 |
| `oauth_state` | `/auth/start/:provider` | 600 秒 | 签名的 state / provider / locale / exp（qyxy 另含 PKCE verifier） |
| `token` | 各 OAuth 回调 | 7 天（qyxy 取 `expires_in`） | 平台 access token，HttpOnly |
