# 文档索引

本目录集中存放 Login-example 的项目文档。README 是快速入口，这里是与代码实现逐项对齐的参考手册。

## 文档清单

| 文档 | 内容 | 适合谁 |
|---|---|---|
| [架构说明](ARCHITECTURE.md) | 系统组成、目录职责、OAuth 认证流程、安全机制、多语言路由 | 想理解「为什么这样实现」的开发者 |
| [API 参考](API.md) | 所有 Pages Functions 端点、请求参数、响应与错误码 | 前端联调、二次开发 |
| [环境变量参考](ENVIRONMENT.md) | 逐个变量的作用、默认值、可见性、是否必填 | 本地搭建、部署配置 |
| [部署指南](DEPLOYMENT.md) | Cloudflare Pages 部署、各平台控制台配置、回调地址清单 | 上线维护者 |
| [故障排查](TROUBLESHOOTING.md) | 常见错误、HTTPS 证书、Turnstile、Cookie 等问题的排查路径 | 遇到报错时 |
| [测试与检查](TESTING.md) | `npm test` / `npm run check:env` 的真实行为与手动验证流程 | 提交前自检 |
| [本地 DeepSeek 桥接](DSH-BRIDGE.md) | 仅本地运行的 DeepSeek 账号信息演示 | 想体验 DSH 功能的用户 |

仓库根目录另有：

- [CONTRIBUTING.md](../CONTRIBUTING.md)：贡献流程与开发约定。
- [CHANGELOG.md](../CHANGELOG.md)：变更记录。
- [README.md](../README.md) / [README.zh-CN.md](../README.zh-CN.md) / [README.zh-TW.md](../README.zh-TW.md)：项目简介（英 / 简中 / 繁中）。

## 约定

- 文档中的路径均以仓库根目录为基准。
- 环境变量名、端点路径、Cookie 名保持与源码一致，大小写敏感（例如 Google 回调是 `/auth/Google/`，首字母大写且带尾斜杠）。
- 本项目是 OAuth 登录演示，不是生产服务；文档中的安全描述均以「演示项目」为前提。
