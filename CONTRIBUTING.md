# 贡献指南

感谢参与 Login-example。本项目是 OAuth 登录演示，欢迎改进文档、补充平台接入、修复问题。

## 开始之前

- 先阅读 [README](README.md) 与 [架构说明](docs/ARCHITECTURE.md)，理解项目是「静态前端 + Cloudflare Pages Functions」结构。
- 通过 Issue 讨论较大的改动（新增 provider、重构认证流程、安全相关变更），避免重复劳动。
- 本项目仅用于演示，任何改动都不应引入真实用户数据处理或生产化身份服务的行为。

## 开发环境

```bash
npm install
cp .env.example .env      # 填入本地凭据
npm run setup:certs       # 生成本地 HTTPS 证书（需 mkcert）
npm run dev               # Vite 5173 + Wrangler 8788(HTTPS)
```

详见 [README 的本地开发章节](README.md#local-development-with-vite)与[环境变量参考](docs/ENVIRONMENT.md)。

## 提交前自检

```bash
npm test              # 静态文件与语言资源完整性
npm run check:env     # 环境变量完整性
npm run build         # 生产构建
```

然后按 [测试与检查](docs/TESTING.md#手动验证流程) 的清单手动验证受影响的流程。没有自动化测试覆盖，手动验证尤其重要。

## 改动约定

### 新增 OAuth 平台

需要同时改动多处，缺一不可：

1. `functions/auth/start/[provider].ts`：在 `providerConfig` 中加入配置，并补齐授权 URL 与 scope。
2. `functions/auth/{provider}.ts`：实现回调（校验 `oauth_state`、换 token、写 `token` Cookie、302 到账号页）。
3. `functions/api/{provider}/me.ts` 与 `exit.ts`：用户信息代理与退出登录。
4. `.env.example`、[环境变量参考](docs/ENVIRONMENT.md)：新增变量声明与说明。
5. `js/i18n.js`：三语文案（登录按钮、平台名）。
6. `me/{provider}/`：账号页；`vite.config.mjs` 会自动收集 HTML。
7. 三语 README 的支持表格与 [API 参考](docs/API.md)。
8. 平台控制台登记回调地址，并在 [部署指南](docs/DEPLOYMENT.md) 补充配置说明。

### 多语言

- 前端文案集中在 `js/i18n.js`，三种语言为 `en-us`、`zh-cn`、`zh-hant`，需同步更新。
- 法律文本在 `i18n/legal/{locale}/`，`agreement/` 是历史版本；改动以 `i18n/legal/` 为准。
- 新增语言需同时更新 `js/i18n.js`、`functions/_lib/security.ts` 的 `supportedLocales`、`functions/_middleware.js` 的 `requestLanguage`，并新增对应的 HTML 目录与 `i18n/legal/{locale}/`。

### 文档

- README 是快速入口，保持三语同步；技术细节放 `docs/`。
- 修改端点、环境变量或 Cookie 行为时，同步更新 [API 参考](docs/API.md)、[环境变量参考](docs/ENVIRONMENT.md) 与 [架构说明](docs/ARCHITECTURE.md)。

### 提交信息

推荐使用 Conventional Commits 风格，例如：

```
feat(auth): add Foo OAuth provider
fix(dsh): allow local https origin in returnTo validation
docs: add deployment guide
```

## Pull Request

- 一个 PR 聚焦一件事；描述改动动机、影响范围与验证方式。
- 附上自检命令输出与关键流程的验证结果。
- 涉及 UI 改动请附截图；涉及安全或流程改动请说明理由与潜在风险。

## 行为准则

尊重他人，聚焦技术问题。不要提交包含真实凭据、token 或个人数据的文件。
