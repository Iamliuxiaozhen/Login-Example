# Login-example

An open-source project that demonstrates OAuth login flows for GitHub, Microsoft, Google, and more. Step-by-step tutorials live in the Wiki. You can try it at the hosted page.

[https://login-example.liuxiaozhen.dev/](https://login-example.liuxiaozhen.dev/)

## Readme languages

- [繁體中文](README.zh-TW.md) (Traditional Chinese)
- [简体中文](README.zh-CN.md) (Simplified Chinese)

## Supported providers

| Provider | Status | Tutorial |
|---|---|---|
| GitHub | Done | In progress |
| Microsoft | Done | In progress |
| Google | Done | In progress |
| X (Twitter) | Planned | Planned |
| Facebook | Ended | Ended |
| Apple | Ended | Ended |

> [!Important]
> This repository was made public on October 19, 2025.

## Important notice

This website is for **OAuth login demonstration purposes only** and does **not** contain any phishing content. Both the frontend and backend code are **open-source**, and anyone may review the source code for verification.

**Repository:** [https://github.com/Iamliuxiaozhen/Login---Example](https://github.com/Iamliuxiaozhen/Login-Example)

### Language paths

The site is available at `/zh-cn`, `/zh-hant`, and `/en-us`. Visiting `/` selects a locale from the browser language and falls back to English. Legacy addresses without a locale prefix are redirected to a matching path.

## Local development with Vite

1. Copy `.env.example` to `.env`.
2. Put local OAuth credentials and `https://localhost:8788` callback URLs in `.env`.
3. Run `npm install`.
4. Run `npm run setup:certs` to generate and trust a local HTTPS certificate (requires [mkcert](https://github.com/FiloSottile/mkcert)).
5. Run `npm run dev`.
6. Open `https://localhost:8788/zh-cn/`, `https://localhost:8788/zh-hant/`, or `https://localhost:8788/en-us/`.

> **HTTPS certificates**: Wrangler serves the local Pages Functions behind HTTPS on port `8788`. Without a trusted local certificate, the browser shows a "Your connection is not private" warning, and Vite HMR's `wss://localhost:8788` connection can fail with OpenSSL `CERTIFICATE_UNKNOWN` errors in the Wrangler logs. `npm run setup:certs` uses [mkcert](https://github.com/FiloSottile/mkcert) to install a local CA and create `.wrangler/certs/localhost.pem` + `.wrangler/certs/localhost-key.pem` covering `localhost`, `127.0.0.1`, and `::1`. `npm run dev` automatically passes those certificates to Wrangler when they exist.

The development command starts Vite on `5173` and Wrangler Pages Functions on HTTPS port `8788`. It does not block startup for missing environment variables: selecting an unconfigured OAuth provider shows a localized message in the frontend. Use `npm run check:env` before deploying to validate the complete configuration. Vite handles frontend HMR; Wrangler handles `/auth/*`, `/api/*`, and `/verify`.

## Cloudflare Pages builds

Set the dashboard Build command to `npm run build` and Build output directory to `dist`. The repository intentionally does not include an auto-detected `wrangler.jsonc` Pages build configuration, so an existing Pages project without a build command will continue deploying its configured root directory instead of failing because `dist` was never created.

## Environment variables

The project accepts both exported shell variables and `.env` values. Existing exported variables win over values loaded from `.env`. Do not commit `.env`; use `.env.example` as the template. OAuth client secrets and signing keys are server-only variables, while `VITE_TURNSTILE_SITE_KEY` is intentionally exposed to the browser.

© 2025 Login-example.

[Terms of Service](agreement/terms-service/text.md)
[Privacy Policy](agreement/PrivacyPolicy/text.md)

This project is licensed under the Apache License 2.0.
