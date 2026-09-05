// @ts-nocheck
import { clearCookie, normalizeLocale, readCookie, verifyValue } from "../_lib/security";

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const stateData = await verifyValue(readCookie(request, "oauth_state"), env.TURNSTILE_SESSION_SECRET || env.TURNSTILE_SECRET_KEY);

    if (!code || !stateData || stateData.provider !== "github" || stateData.state !== state) {
      return new Response(JSON.stringify({ error: "missing_code" }), { status: 400 });
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "User-Agent": "Cloudflare-Worker-OAuth",
      },
      body: new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json(); // 正确解析 JSON
    const accessToken = tokenData.access_token;

    if (!accessToken || accessToken.length < 10) {
      return new Response(JSON.stringify({ error: "no_token", detail: JSON.stringify(tokenData) }), { status: 401 });
    }

    const cookie = [
      `token=${accessToken}`,
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      `Expires=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()}`,
    ].join("; ");

    const headers = new Headers({ Location: `/${normalizeLocale(stateData.locale)}/me/github` });
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
