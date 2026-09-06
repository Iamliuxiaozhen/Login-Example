# Login-example

這是一個登入示範專案，教你接入各平台（如 Google、Microsoft 與 GitHub）的登入方式，教學在 Wiki 中。您可在網頁端體驗。
[https://login-example.liuxiaozhen.dev/](https://login-example.liuxiaozhen.dev/)

## 各平台接入

| 平台 | 情況 | 教學 |
|---|---|---|
| GitHub | ✅ 已接入 | ⏳ 進行中 |
| Microsoft | ✅ 已接入 | ⏳ 進行中 |
| Google | ✅ 已接入 | ⏳ 進行中 |
| X（Twitter） | 🗒︎ 規劃中 | 🗒︎ 規劃中 |
| Facebook | ⏹ 計劃終止 | ⏹ 計劃終止 |
| Apple | ⏹ 計劃終止 | ⏹ 計劃終止 |

> [!Important]
> 本倉庫已於 2025 年 10 月 19 日公開。

## 重要聲明

### 語言路徑

網站提供简体中文、繁體中文與 English 三種語言：`/zh-cn`、`/zh-hant`、`/en-us`。瀏覽根路徑時會依瀏覽器語言自動選擇；舊的無語言前綴網址會相容重新導向。

部署 OAuth 登入前，請設定 `TURNSTILE_SECRET_KEY`、`TURNSTILE_SESSION_SECRET` 及各平台的 OAuth 環境變數。`TURNSTILE_SESSION_SECRET` 用於簽署短期驗證與 OAuth 狀態 Cookie，不應與前端程式碼或倉庫共用。

本網站僅作為登入示範使用，不含任何釣魚內容。本網站及其後端程式碼均已開源，如有疑問可自行審查原始碼。

**倉庫位址：** [https://github.com/Iamliuxiaozhen/Login---Example](https://github.com/Iamliuxiaozhen/Login-Example)

## 本地開發（Vite）

1. 複製 `.env.example` 為 `.env`。
2. 在 `.env` 填入本機 OAuth 憑證，並將回呼網址指向 `https://localhost:8788`。
3. 執行 `npm install`。
4. 執行 `npm run setup:certs`，產生並信任本機 HTTPS 憑證（需要安裝 [mkcert](https://github.com/FiloSottile/mkcert)）。
5. 執行 `npm run dev`。
6. 開啟 `https://localhost:8788/zh-cn/`、`https://localhost:8788/zh-hant/` 或 `https://localhost:8788/en-us/`。

> **HTTPS 憑證說明**：Wrangler 會在本地透過 HTTPS 連接埠 `8788` 提供 Pages Functions。如果不安裝本機可信憑證，瀏覽器會顯示「您的連線不是私人連線」警告，同時 Vite HMR 的 `wss://localhost:8788` 連線可能失敗，並在 Wrangler 日誌中出現 OpenSSL `CERTIFICATE_UNKNOWN` 錯誤。`npm run setup:certs` 會使用 [mkcert](https://github.com/FiloSottile/mkcert) 安裝本機 CA，並產生 `.wrangler/certs/localhost.pem` 與 `.wrangler/certs/localhost-key.pem`，覆蓋 `localhost`、`127.0.0.1` 與 `::1`。當這些檔案存在時，`npm run dev` 會自動把它們傳給 Wrangler。

開發指令會在 `5173` 啟動 Vite，並在 HTTPS 連接埠 `8788` 啟動 Wrangler Pages Functions。它不會因缺少環境變數而阻止啟動：選擇未設定的 OAuth 平台時，前端會顯示本地化提示。部署前請使用 `npm run check:env` 驗證完整設定。Vite 負責前端 HMR；Wrangler 負責 `/auth/*`、`/api/*` 與 `/verify`。

## Cloudflare Pages 建置

在儀表板中設定 Build command 為 `npm run build`，Build output directory 為 `dist`。本倉庫刻意不包含自動偵測的 `wrangler.jsonc` Pages 建置設定，因此已有未設定建置指令的 Pages 專案會繼續部署其設定的根目錄，而不是因從未產生 `dist` 而建置失敗。

## 環境變數

專案同時接受匯出的 shell 變數與 `.env` 值。已匯出的變數優先於從 `.env` 載入的值。請勿提交 `.env`，以 `.env.example` 為範本。OAuth Client Secret 與簽名金鑰是僅伺服端的變數，而 `VITE_TURNSTILE_SITE_KEY` 會暴露給瀏覽器。

© 2025 Login-example.

[服務條款](agreement/terms-service/text.md)
[隱私政策](agreement/PrivacyPolicy/text.md)

本作品採用 Apache License 開源。
