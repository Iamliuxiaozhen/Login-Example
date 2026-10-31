// @ts-nocheck
const DEFAULT_AUTH_URL = "https://cloud.hopex.top/account";

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const token = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)token=([^;]+)/)?.[1];
    const accessToken = token ? decodeURIComponent(token) : null;

    if (!accessToken || accessToken.length < 10) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authBase = String(env.QYXY_AUTH_URL || DEFAULT_AUTH_URL).replace(/\/+$/, "");
    const userRes = await fetch(`${authBase}/api/userinfo.php`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const payload = await userRes.json().catch(() => ({}));
    const user = payload.data || payload;

    if (!userRes.ok || !user.user_id) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const safeUser = {
      id: user.user_id,
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      avatar: user.avatar,
      level: user.level,
      user_group: user.user_group,
    };

    return new Response(JSON.stringify({ authenticated: true, user: safeUser }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "server_error", message: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
