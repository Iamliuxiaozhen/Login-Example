// @ts-nocheck
import { clearCookie, normalizeLocale, readCookie, verifyValue } from "../_lib/security";

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const stateData = await verifyValue(readCookie(request, "oauth_state"), env.TURNSTILE_SESSION_SECRET || env.TURNSTILE_SECRET_KEY);

    if (!code || !stateData || stateData.provider !== "google" || stateData.state !== state) {
      return new Response(JSON.stringify({ error: "missing_code" }), { status: 400 });
    }

    // 交换 Access Token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const idToken = tokenData.id_token;

    if (!accessToken || !idToken) {
      return new Response(JSON.stringify({ error: "no_token", detail: JSON.stringify(tokenData) }), { status: 401 });
    }

    // 解析 ID Token（JWT）
    const [, payloadBase64] = idToken.split(".");
    const payload = JSON.parse(atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")));


    const cookie = [
      `token=${accessToken}`,
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      `Expires=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()}`,
    ].join("; ");

    const headers = new Headers({ Location: `/${normalizeLocale(stateData.locale)}/me/google/` });
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
