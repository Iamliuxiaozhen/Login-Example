# 测试与检查

本项目目前**没有单元测试框架**（`devDependencies` 中无 vitest / jest / mocha，仓库内也没有 `*.test.*` 或 `*.spec.*` 文件）。`npm test` 与 `npm run check:env` 都是轻量脚本，用于提交前自检，不能等同于测试覆盖。

## `npm test`（`scripts/check.mjs`）

执行静态完整性检查：

1. 从 `.`、`zh-cn`、`zh-hant`、`en-us` 递归收集所有 `.html` / `.js` / `.ts` 文件（排除 `node_modules`、`.git`、`dist`、`.wrangler`），逐个读取（`404.html` 除外），确保每个 HTML 含 `<html` 与 `</html>`。
2. 确认每种语言的 `index.html`、`i18n/legal/{locale}/terms.md`、`privacy.md` 可读。
3. 确认 `vite.config.mjs`、`.env.example` 可读。
4. 确认 `.env.example` 包含全部 15 个指定变量声明（含 4 个 `QYXY_*`）。
5. 全部通过后输出 `Checked N HTML/JS/TS files and all locale assets.`

它**不做**的事：不执行任何 `functions/` 或 `scripts/` 代码、不校验 TS/JS 语法、不校验变量的值、不启动 Wrangler/Vite、不测试任何端点或 OAuth 流程。

## `npm run check:env`（`scripts/check-env.mjs`）

校验 14 个必需环境变量是否存在（已导出的 shell 变量优先于 `.env`）：Turnstile 2 项，GitHub / Google / Microsoft / Qyxy 各 3 项。缺任一变量即退出码 1 并列出缺失名单。

注意：`check:env` 不检查 `QYXY_AUTH_URL`（代码有兜底），但 `npm test` 要求 `.env.example` 中声明它。两者口径不同，详见 [环境变量参考](ENVIRONMENT.md#qyxy-授权服务地址)。

## 构建检查

```bash
npm run build
```

- 生产模式缺少 `VITE_TURNSTILE_SITE_KEY` 会直接失败，因此这也是对该变量的强校验。
- 构建会清空 `dist/`，不应在 `dist/` 中手动维护文件。

## 手动验证流程

由于没有自动化测试，改动后请按以下清单手动验证：

1. **静态检查**：`npm test`、`npm run check:env`、`npm run build` 全部通过。
2. **本地启动**：`npm run dev`，访问 `https://localhost:8788/zh-cn/`、`/zh-hant/`、`/en-us/`，确认 Turnstile 显示、语言切换正常。
3. **每条登录链路**：对每个已配置的平台走一遍「验证 → 授权 → 回调 → 账号页显示资料 → 退出」，确认 Cookie 正确写入与清除。
4. **错误路径**：故意不选 Turnstile 就发起登录（应跳 `?error=verification`）；选择一个未配置平台（应跳 `?error=configuration`）。
5. **中间件**：访问 `/` 确认按语言跳转；访问旧路径（如 `/me/github`）确认重定向到带前缀路径。
6. **DSH 功能**：如需验证，运行 `npm run dev:dsh` 并按 [DSH-BRIDGE.md](DSH-BRIDGE.md) 走本地授权流程。
7. **部署后**：按 [部署指南](DEPLOYMENT.md#六部署后验证) 的清单在生产域名复验。

## 引入真正测试的约定（建议）

若后续引入测试框架：

- 优先为 `functions/_lib/security.ts` 的 `signValue` / `verifyValue` / `generatePkce` / `normalizeLocale` 写单元测试——它们是纯函数且是安全关键路径。
- 中间件（`functions/_middleware.js`）的重定向逻辑适合做请求/响应级别的断言。
- 测试文件与被测模块同目录，命名为 `*.test.ts` 或 `*.spec.ts`，并排除在 Vite 页面入口之外。
- 更新 `package.json` 的 `test` 脚本与本文件，明确自动化检查与手动验证的分工。
