// @ts-nocheck
import { clearCookie, normalizeLocale, readCookie, verifyValue } from "../_lib/security";

const DEFAULT_AUTH_URL = "https://cloud.hopex.top/account";

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateData = await verifyValue(readCookie(request, "oauth_state"), env.TURNSTILE_SESSION_SECRET || env.TURNSTILE_SECRET_KEY);
  const locale = normalizeLocale(stateData?.locale);
  const authBase = String(env.QYXY_AUTH_URL || DEFAULT_AUTH_URL).replace(/\/+$/, "");

  if (!code || !stateData || stateData.provider !== "qyxy" || stateData.state !== state) {
    return new Response(JSON.stringify({ error: "missing_code" }), { status: 400 });
  }

  try {
    const tokenRes = await fetch(`${authBase}/api/token.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: env.QYXY_CLIENT_ID,
        client_secret: env.QYXY_CLIENT_SECRET,
        redirect_uri: env.QYXY_REDIRECT_URI,
        code_verifier: stateData.verifier || "",
      }),
    });

    const tokenData = await tokenRes.json().catch(() => ({}));
    const accessToken = tokenData.access_token || tokenData.data?.access_token;

    if (!tokenRes.ok || !accessToken) {
      const detail = tokenData.error_description || tokenData.data?.error_description || "no_token";
      return new Response(JSON.stringify({ error: "token_error", detail }), { status: 401 });
    }

    const expiresIn = Number(tokenData.expires_in || tokenData.data?.expires_in) || 7200;
    const cookie = [
      `token=${encodeURIComponent(accessToken)}`,
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      `Max-Age=${expiresIn}`,
      `Expires=${new Date(Date.now() + expiresIn * 1000).toUTCString()}`,
    ].join("; ");

    const headers = new Headers({ Location: `/${locale}/me/qyxy/` });
    headers.append("Set-Cookie", cookie);
    headers.append("Set-Cookie", clearCookie("oauth_state"));
    headers.append("Set-Cookie", clearCookie("turnstile_session"));
    return new Response(null, { status: 302, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "server_error", message: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
