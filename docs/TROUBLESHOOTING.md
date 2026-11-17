# 故障排查

按现象分类的排查路径。排查前建议先跑一次 `npm run check:env` 和 `npm test` 排除配置与文件缺失问题。

## HTTPS / 证书问题

**现象**：浏览器提示「您的连接不是私密连接」；Wrangler 日志出现 OpenSSL `CERTIFICATE_UNKNOWN`；Vite HMR 的 `wss://localhost:8788` 连接失败。

**原因**：Wrangler 通过 HTTPS 端口 `8788` 提供 Pages Functions，而 Cookie 带 `Secure` 属性，本地必须使用受信任的 HTTPS 证书。

**处理**：

1. 安装 [mkcert](https://github.com/FiloSottile/mkcert)。
2. 运行 `npm run setup:certs`，会安装本地 CA 并生成 `.wrangler/certs/localhost.pem` 与 `localhost-key.pem`，覆盖 `localhost`、`127.0.0.1`、`::1`。
3. 重新启动 `npm run dev`——检测到证书文件后会自动传给 Wrangler。
4. 若仍报错，确认访问地址用的是 `https://localhost:8788`（而非 `http://` 或 `127.0.0.1`），并确认浏览器信任了 mkcert 的根 CA。

## 首页提示配置错误

**现象**：点击登录跳回首页，URL 带 `?error=configuration&provider=xxx`。

**原因**：`/auth/start/:provider` 检测到该 provider 的 Client ID / Secret / Redirect URI 或 Turnstile 密钥缺失。

**处理**：对照 [环境变量参考](ENVIRONMENT.md) 填齐变量，确认 `.env` 存在且未被 shell 中同名的空变量覆盖（导出变量优先于 `.env`）。改完重启 `npm run dev`。

**现象**：URL 带 `?error=verification`。

**原因**：`turnstile_session` Cookie 缺失或已过期（有效期 5 分钟）。

**处理**：重新完成 Turnstile 验证再登录；确认 `TURNSTILE_SECRET_KEY` 正确。

## Turnstile 不显示或校验失败

- 组件不显示：检查 `VITE_TURNSTILE_SITE_KEY` 是否已填；生产构建缺此变量会直接失败，开发模式则组件为空。
- `/verify` 返回 `403` + error-codes：核对 Site Key 与 Secret Key 是否属于同一个 widget，并检查域名是否在该 widget 的允许列表中（本地需包含 `localhost`）。
- 返回 `502 verification_unavailable`：Cloudflare `siteverify` 暂时不可达，稍后重试。
- 返回 `500 missing_secret`：服务端未配置 `TURNSTILE_SECRET_KEY`。

## 回调报错

| 响应 | 含义 | 排查 |
|---|---|---|
| `400 missing_code` | 缺 code，或 state 校验失败 / provider 不匹配 | 确认 OAuth App 登记的回调地址与 `*_REDIRECT_URI` 完全一致；确认浏览器未禁用 Cookie；确认回调在 10 分钟内完成（state 有效期） |
| `401 no_token` | 换 token 失败 | 核对 Client ID / Secret；确认 code 未被重复使用；查看响应体 `detail` 中的上游错误信息 |
| 回调后空白或跳错语言 | locale 丢失 | 发起登录时带 `?locale=zh-cn` 等合法值；非法值会回落到 `en-us` |

**Google 特别注意**：回调路径是 `/auth/Google/`，首字母大写且带尾斜杠。`GOOGLE_REDIRECT_URI` 与控制台登记的地址必须逐字符一致，写成 `/auth/google/` 或不带斜杠都会失败。

## 账号页拿不到资料

**现象**：登录后进入账号页，但资料为空或提示未登录。

**排查**：

1. 打开浏览器开发者工具 → Application → Cookies，确认存在 `token` Cookie（HttpOnly，由回调写入）。
2. 检查 `/api/{provider}/me` 的响应：未授权通常意味着 `token` 缺失或已过期（7 天）。
3. 若 Cookie 存在但仍失败，可能是平台 token 被撤销，重新登录即可。
4. 退出登录会清除**所有** Cookie，包括其他平台的会话——这是当前实现的行为。

## Cookie 与语言路由

- 退出后再次访问 `/{locale}/me/{provider}/` 应提示未登录；若仍能显示资料，说明 Cookie 未清除干净，可手动清除站点数据。
- 访问 `/` 总是按 `Accept-Language` 跳转；要固定语言请直接访问 `/zh-cn/`、`/zh-hant/`、`/en-us/`。
- 旧地址（如 `/me/github`）会 302 到带语言前缀的路径，书签无需手动更新。

## 本地 DeepSeek 桥接

见 [DSH-BRIDGE.md](DSH-BRIDGE.md) 的运行与安全边界说明。常见问题：桥未启动（先运行 `npm run dev:dsh`）、未授权账号（点击 DeepSeek 按钮完成授权）、公网环境（该功能仅本地可用）。

## 已知问题

- **GitHub 撤销授权可能不生效**：`/api/github/log_out` 从名为 `github_token` 的 Cookie 读取 token（`functions/api/github/log_out.ts`），而 GitHub 回调实际写入的 Cookie 名为 `token`（`functions/auth/github.ts`）。因此撤销请求可能因取不到 token 而跳过；清除本地 Cookie 的行为不受影响。若要主动撤销平台授权，需统一 Cookie 命名或在 GitHub 账户设置中手动撤销。
- **法律文本存在两份**：协议页实际读取 `i18n/legal/{locale}/` 下的新版文本；`agreement/*/text.md` 是历史版本，内容可能过时。以 `i18n/legal/` 为准。
- **`locale/` 为空目录**：无实际作用，语言资源在 `js/i18n.js` 与 `i18n/legal/`。

## 仍然无法解决

在仓库提交 Issue，附上：复现步骤、所用平台、浏览器与系统、相关端点响应、`npm run check:env` 与 `npm test` 输出，以及脱敏后的 Wrangler / Pages Functions 日志。
