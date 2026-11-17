# 部署指南

本项目部署到 **Cloudflare Pages**：静态页面由 Pages 托管，后端逻辑由 Pages Functions（`functions/` 目录）提供。不需要单独部署 Worker 或服务器。

## 一、部署前检查

```bash
npm install
npm run check:env     # 校验全部必需环境变量已设置
npm test              # 静态文件与语言资源完整性检查
npm run build         # 生产构建；缺少 VITE_TURNSTILE_SITE_KEY 会在此失败
```

`npm run build` 输出到 `dist/`。构建产物中应包含三语首页、`me/`、`js/`、`css/`、`i18n/legal/` 等目录。

> 本项目**刻意不包含** `wrangler.jsonc` Pages 构建配置。这是为了让已有、但未配置构建命令的 Pages 项目继续部署其配置的根目录，而不是因为从未生成 `dist` 就构建失败。部署时请在仪表盘显式设置构建命令与输出目录。

## 二、Cloudflare Pages 配置

在 Cloudflare 仪表盘创建或进入 Pages 项目，连接 GitHub 仓库后设置：

| 配置项 | 值 |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 仓库根目录 |
| Node.js 版本 | 18 或更高（建议 20+） |

## 三、配置环境变量

在 Pages 项目的 **Settings → Environment variables** 中添加变量，区分 Production 与 Preview 环境。完整的变量清单见 [环境变量参考](ENVIRONMENT.md)。

生产环境至少需要：

- `VITE_TURNSTILE_SITE_KEY`（生产构建必填，否则构建失败）
- `TURNSTILE_SECRET_KEY`、`TURNSTILE_SESSION_SECRET`
- 实际启用的每个 provider 的三件套（ID / Secret / Redirect URI）

所有 OAuth Secret 与签名密钥只填在服务端变量中，**不要**加 `VITE_` 前缀。修改变量后需要重新部署才会生效。

## 四、各平台控制台配置

回调地址（Redirect URI）必须与代码里的 `*_REDIRECT_URI` 完全一致，否则平台会拒绝回调。生产环境把本地 `https://localhost:8788/...` 换成正式域名。

| 平台 | 控制台位置 | 需登记的 Redirect URI | 备注 |
|---|---|---|---|
| GitHub | Settings → Developer settings → OAuth Apps | `https://<域名>/auth/github` | 生成本地与线上两个 OAuth App，分别填各自地址 |
| Google | Google Cloud Console → Credentials → OAuth client ID | `https://<域名>/auth/Google/` | **大写 G + 尾斜杠**，大小写或斜杠不符会失败 |
| Microsoft | Entra / Azure Portal → App registrations → Authentication | `https://<域名>/auth/microsoft` | 本项目用 `consumers` 租户，仅支持个人账户 |
| Qyxy（青云学研） | 统一认证服务管理员 | `https://<域名>/auth` | 需同时配置 `QYXY_AUTH_URL`（默认 `https://cloud.hopex.top/account`） |

本地开发时回调地址使用 `https://localhost:8788/...`（详见 [环境变量参考](ENVIRONMENT.md)）。

## 五、域名与重定向

`functions/_middleware.js` 内置两条重定向逻辑：

1. 访问 `login---example.pages.dev` 会 301 到自定义域名 `login-example.liuxiaozhen.dev`。若使用自己的域名，按需修改该中间件。
2. 根路径 `/` 按浏览器 `Accept-Language` 302 到对应语言首页；旧的无前缀路径（如 `/me/github`）会兼容重定向到带语言前缀的路径。

自定义域名在 Pages 项目的 **Settings → Domains** 绑定。绑定后记得把各平台控制台的回调地址同步为正式域名。

## 六、部署后验证

按顺序确认：

1. 首页正常加载，Turnstile 组件显示（验证 `VITE_TURNSTILE_SITE_KEY` 生效）。
2. 访问 `/zh-cn/`、`/zh-hant/`、`/en-us/` 三种语言均正常；访问 `/` 能跳转。
3. 依次测试已配置的平台登录：能否跳转授权、回调后是否进入 `/{locale}/me/{provider}/` 并显示资料。
4. 测试退出登录，确认 Cookie 被清除（重新访问账号页应提示未登录）。
5. 查看 Functions 日志，确认无 `no_token`、`CERTIFICATE_UNKNOWN` 等错误。

遇到问题时见 [故障排查](TROUBLESHOOTING.md)。

## 七、本地预览生产构建

```bash
npm run build
npm run preview          # Vite 预览，端口 4173（不含 Functions）
```

注意：`vite preview` 只预览静态资源，**不会运行 Pages Functions**，因此登录流程无法在此模式下工作。要完整验证请使用 `npm run dev`。
