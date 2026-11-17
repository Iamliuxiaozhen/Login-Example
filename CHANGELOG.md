# 变更记录

本文件记录项目的关键变更。早期历史可直接查看 [Git 提交记录](https://github.com/Iamliuxiaozhen/Login-Example/commits/main)。格式参考 [Keep a Changelog](https://keepachangelog.com/)，日期为对应提交日期。

## 2026-11-17

### Added

- 本地 DeepSeek 账号信息桥接（DSH）：仅本地运行，展示自己的头像、昵称、脱敏手机号与余额；公网部署显示「仅在本地尝试」提示。协议依据 DeepSeek 开源的 DSH 实现。（`scripts/dsh-*.mjs`、`me/dsh/`、`js/dsh-entry.js`）
- DSH 登录改为新标签页发起授权，授权后自动跳回本地账号页；回跳地址做严格同源与固定路径校验。
- DSH 专题文档 [docs/DSH-BRIDGE.md](docs/DSH-BRIDGE.md)。

### Fixed

- DSH 凭据读取兼容桥自身存储结构；本地 HTTPS origin 的 `returnTo` 校验；使用 DeepSeek 官方图标。

## 2026-10-31

### Added

- Qyxy（青云学研）统一身份认证接入：发起、回调、用户信息与退出，采用 PKCE S256。（`e737d0a`）

## 2026-09-06

### Added

- README 简体中文与繁體中文版本。（`5a09a0d`）

### Changed

- 本地 HTTPS 证书生成流程文档化，加入 `npm run setup:certs`。（`f667941`）
- 协议页与账号页路由稳定化，账号页样式改为固定引用 `css/me/style.css`。（`117da3f`）

## 2026-09-05

### Added

- OAuth 认证与本地开发配置：Turnstile 校验、签名 state、各平台回调与账号页。（`7250d59`）
- 多语言登录页与法律协议页，含语言切换。（`847887d`、`27e15a9`）

### Changed

- Wrangler 配置从 `wrangler.jsonc` 迁移到 CLI 参数（见 [部署指南](docs/DEPLOYMENT.md)）。（`105ce3a`）
- 缺少 OAuth 配置时前端显示本地化提示，不再阻断启动。（`d620b6e`）

## 2026-03

### Added

- Microsoft 身份关联配置文件 `.well-known/microsoft-identity-association.json`。（`0aedcc1`）
- `CODEOWNERS`。（`e0a9915`）

### Changed

- 更新硬编码域名与重定向 URI；切换为 Apache License 2.0。

## 2025-10

- 项目于 2025 年 10 月 19 日公开。
- 发布关于站点被 Google / Microsoft / Cloudflare 标记的说明，见 [essay/对于Google,Microsoft,Cloudflare封锁站点的回应.md](essay/对于Google,Microsoft,Cloudflare封锁站点的回应.md)。

> 提交哈希取自当前 `main` 分支历史，仅作定位参考。更细粒度的变更请以 Git 历史为准。
