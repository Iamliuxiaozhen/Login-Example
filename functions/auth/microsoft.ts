// @ts-nocheck
import { clearCookie, normalizeLocale, readCookie, verifyValue } from "../_lib/security";

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const stateData = await verifyValue(readCookie(request, "oauth_state"), env.TURNSTILE_SESSION_SECRET || env.TURNSTILE_SECRET_KEY);

    if (!code || !stateData || stateData.provider !== "microsoft" || stateData.state !== state) {
      return new Response(JSON.stringify({ error: "missing_code" }), { status: 400 });
    }

    // 1. 获取 access token
    const tokenRes = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Cloudflare-Worker-OAuth",
      },
      body: new URLSearchParams({
        client_id: env.MICROSOFT_CLIENT_ID,
        client_secret: env.MICROSOFT_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: env.MICROSOFT_REDIRECT_URI, // 你的回调地址
        scope: "openid profile email User.Read",
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken || accessToken.length < 10) {
      return new Response(JSON.stringify({ error: "no_token", detail: JSON.stringify(tokenData) }), { status: 401 });
    }

    // 2. 设置 cookie
    const cookie = [
      `token=${accessToken}`,
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      `Expires=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()}`,
    ].join("; ");

    // 3. 重定向到你的页面
    const headers = new Headers({ Location: `/${normalizeLocale(stateData.locale)}/me/microsoft/` });
    headers.append("Set-Cookie", cookie);
    headers.append("Set-Cookie", clearCookie("oauth_state"));
    headers.append("Set-Cookie", clearCookie("turnstile_session"));
    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "server_error", message: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
