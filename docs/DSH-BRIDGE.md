# 本地 DSH 账号信息桥接（尝鲜演示）

这是一个**仅本地运行**的演示功能：在本机读取你自己的 DeepSeek 账号信息（头像、昵称、脱敏手机号、充值/赠送余额）并展示。公网部署时只显示「请在本地尝试」，不提供任何账号数据。

> 本项目是给开发者的 OAuth 登录演示，不是生产服务。该功能不接入本站的标准 OAuth provider，也不要求你为网站单独安装 DSH 客户端——鉴权与请求全部由项目自带的本地桥完成。

## 运行

```bash
npm install
npm run dev:dsh
```

默认监听 `http://127.0.0.1:8789`（仅回环地址，局域网/公网无法访问）。可用环境变量 `DSH_BRIDGE_PORT` 改端口。

在首页点击「使用 DeepSeek 账号登录」即可直接发起授权：入口脚本 `js/dsh-entry.js` 会先判断环境——

- 公网域名 → 跳到 `/me/dsh/` 显示「该功能仅在本地运行」；
- 本地但桥未启动 → 同样跳到 `/me/dsh/` 提示先运行 `npm run dev:dsh`；
- 本地且桥正常 → 用**新标签页**打开 DeepSeek 授权页，用户无需返回原页面。

授权完成后，新标签页自动跳回本地账号页 `/me/dsh/`，直接展示头像、昵称、脱敏手机号与余额。回跳地址经严格校验，只接受本机 origin 的 `/me/dsh` 路径，防止开放重定向。

## 首次使用：授权账号

桥需要一条 DeepSeek 账号 grant token 才能查询资料。它按以下优先级读取：

1. 桥自己的本地存储 `~/.login-example-dsh/credentials.json`（本功能登录后写入）；
2. DSH 自身的凭据 `~/.dsh/.credentials.yaml` 中 `deepseek-account-platform/default` 记录。

若两者都没有，点击首页（或账号页）的 DeepSeek 登录按钮：

1. 前端探测到本机桥可用后，在用户点击的同步调用栈内预开新标签页（规避浏览器弹窗拦截），再调用 `POST /api/login/start`；
2. 桥调用 `auth_init`，生成 S256 PKCE 参数，并把本地账号页作为 `returnTo` 存入会话；
3. 新标签页打开 DeepSeek 授权页，你用自己的账号登录并同意；
4. 平台回跳到 `http://127.0.0.1:<端口>/oauth/callback`，桥校验 state 后用 code 兑换 token；
5. token 存入桥自己的本地存储（不修改 DSH 的凭据文件），随后 302 回跳到 `returnTo` 指定的本地账号页。

回调只接受带显式端口的 `localhost` / `127.0.0.1` / `[::1]`，并做同源、固定路径、state 常量时间比较与单值校验，与 DSH 官方实现一致。

## 端点

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/health` | 存活探测 |
| GET | `/api/status` | 是否已授权（不含 token） |
| GET | `/api/profile` | 头像 / 昵称 / 脱敏联系方式 |
| GET | `/api/balance` | 充值余额 / 赠送余额 |
| POST | `/api/login/start` | 发起本机浏览器登录 |
| POST | `/api/logout` | 清除桥本地授权 |
| GET | `/oauth/callback` | PKCE 登录回调 |

## 安全边界

- token 只在桥进程内存与本机凭据文件中流转，**不写入前端、不写日志、不返回给公网**；
- 响应与日志均不含 token / code / state；日志只打印路径与状态码；
- 桥只绑定 `127.0.0.1`，CORS 仅放行本地开发来源；
- 凭据文件以 `0600` 权限写入用户主目录，不进项目 git；
- 平台返回的头像 URL 直接来自 Platform，页面按原样展示。

## 协议来源

本功能不是逆向实现，而是依据 DeepSeek 开源的 DSH 源码：

- 仓库：`github.com/deepseek-ai/deepseek-harness`
- 包：`packages/credentials/deepseek-account`
  - `src/client-metadata.ts`：五个 `x-client-*` 客户端身份头
  - `src/protocol.ts`：`x-dsh-auth-token`、三层响应信封、`auth_init` / `auth_exchange`、回环地址校验
  - `src/details.ts`：`/auth-api/v0/users/current` 与 `/api/v0/users/get_user_summary` 接口及字段投影
  - `src/index.ts`：grant 存储结构 `{ version, token, issuer }` 与登录流程

余额字符串按平台原样保留（遵循 big.js 十进制文法，如 `0E-16`）；赠送钱包不计入充值余额。
