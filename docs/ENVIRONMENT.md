# 环境变量参考

变量模板见仓库根目录的 `.env.example`。复制为 `.env` 后填写本地值；**不要提交 `.env`**（已在 `.gitignore` 中）。

## 加载规则

- `scripts/dev.mjs` 与 `scripts/check-env.mjs` 通过 `dotenv.config({ path: '.env', override: false })` 读取，因此**已导出的 shell 变量优先于 `.env` 中的值**。
- Wrangler 通过 `--env-file .env` 把变量注入 Pages Functions；Vite 侧通过 `loadEnv` 读取。
- 生产环境的变量在 Cloudflare Pages 仪表盘配置，见 [部署指南](DEPLOYMENT.md)。
- 只有 `VITE_` 前缀的变量会被 Vite 暴露给浏览器。其余变量是服务端专用，绝不要加 `VITE_` 前缀。

## 前端可见变量

| 变量 | 作用 | 必填性 | 说明 |
|---|---|---|---|
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile 站点公钥，注入首页验证组件 | **生产构建必填** | `vite.config.mjs` 在 `mode === 'production'` 且此值为空时直接抛错；开发构建不校验 |

## Turnstile 密钥（服务端）

| 变量 | 作用 | 必填性 | 默认值 / 备注 |
|---|---|---|---|
| `TURNSTILE_SECRET_KEY` | 服务端校验 Turnstile token；也是会话密钥的兜底 | 是 | 在 Cloudflare 仪表盘创建 widget 时获得，不要暴露给浏览器 |
| `TURNSTILE_SESSION_SECRET` | 签署 `oauth_state` 与 `turnstile_session` Cookie | 建议单独设置 | 代码层面缺省回退到 `TURNSTILE_SECRET_KEY`，但 `npm run check:env` 仍要求显式提供。建议用一个独立的长随机串，不要与站点密钥复用 |

## OAuth 变量（服务端）

每个平台三件套：Client ID、Client Secret、Redirect URI。Client ID 虽在 OAuth 语义上公开，但本项目在服务端 `functions/auth/start/[provider].ts` 中读取，不通过 `VITE_` 暴露。

| 平台 | Client ID | Client Secret | Redirect URI 默认值 |
|---|---|---|---|
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` | `GITHUB_REDIRECT_URI` = `https://localhost:8788/auth/github` |
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` | `GOOGLE_REDIRECT_URI` = `https://localhost:8788/auth/Google/`（注意大写 G 与尾斜杠） |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` | `MICROSOFT_REDIRECT_URI` = `https://localhost:8788/auth/microsoft` |
| Qyxy（青云学研） | `QYXY_CLIENT_ID` | `QYXY_CLIENT_SECRET` | `QYXY_REDIRECT_URI` = `https://login-example.liuxiaozhen.dev/auth` |

- `npm run check:env` 把上述 12 个变量全部视为必填。
- 本地开发无需全部填齐：缺失某个 provider 时，选择该平台会在前端显示配置错误提示（见 [架构说明](ARCHITECTURE.md#oauth-发起时的配置降级)）。回调 URI 需与平台控制台登记的一致，本地用 `8788`，线上用正式域名。

## Qyxy 授权服务地址

| 变量 | 作用 | 必填性 | 默认值 |
|---|---|---|---|
| `QYXY_AUTH_URL` | 企微云统一认证服务基址，用于拼接 `/authorize.php`、`/api/token.php`、`/api/userinfo.php`、`/api/revoke.php` | 运行时可选 | `https://cloud.hopex.top/account`（代码内 `DEFAULT_AUTH_URL`） |

口径差异：`npm run check:env` 不检查 `QYXY_AUTH_URL`（因为代码有兜底），但 `npm test`（`scripts/check.mjs`）会要求 `.env.example` 中存在该变量名。配置时保持 `.env.example` 中的声明即可。

## 本地 DSH 桥变量

仅 `npm run dev:dsh` 使用，不在 `.env.example` 也不被 `check:env` 校验。完整说明见 [DSH-BRIDGE.md](DSH-BRIDGE.md)。

| 变量 | 作用 | 默认值 |
|---|---|---|
| `DSH_BRIDGE_PORT` | 本地桥监听端口 | `8789` |
| `DSH_CLIENT_VERSION` | 覆盖授权请求的 `x-client-version` | 自动探测，兜底 `0.1.5-rc.1` |
| `DSH_HOME` | DSH 凭据根目录 | `~/.dsh` |
| `DSH_CREDENTIALS_PATH` | DSH 凭据文件路径 | `~/.dsh/.credentials.yaml` |
| `DSH_BRIDGE_HOME` | 桥自身凭据与设备文件路径 | `~/.login-example-dsh` |

## 其他

| 变量 | 作用 |
|---|---|
| `NODE_ENV` | 仅用于 `check:env` 输出提示；开发脚本会设为 `development` |

## 变量来源

- **Turnstile**：Cloudflare 仪表盘 → Turnstile → 添加站点，得到 Site Key（前端）与 Secret Key（服务端）。
- **GitHub**：Settings → Developer settings → OAuth Apps，Homepage URL 填站点地址，Authorization callback URL 填 `GITHUB_REDIRECT_URI`。
- **Google**：Google Cloud Console → APIs & Services → Credentials → OAuth client ID，Authorized redirect URIs 填 `GOOGLE_REDIRECT_URI`。
- **Microsoft**：Microsoft Entra / Azure Portal → App registrations → Redirect URIs 填 `MICROSOFT_REDIRECT_URI`（本项目使用 `consumers` 租户，仅个人账户）。
- **Qyxy**：由对应统一认证服务的管理员分配 client_id / client_secret。
