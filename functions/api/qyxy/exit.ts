// @ts-nocheck
import { readCookie } from "../../_lib/security";

const DEFAULT_AUTH_URL = "https://cloud.hopex.top/account";

export const onRequest: PagesFunction = async (context) => {
  const request = context.request;
  const cookieHeader = request.headers.get("cookie") || "";
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const accessToken = readCookie(request, "token");

  if (accessToken) {
    const authBase = String(context.env.QYXY_AUTH_URL || DEFAULT_AUTH_URL).replace(/\/+$/, "");
    await fetch(`${authBase}/api/revoke.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        token: accessToken,
        client_id: context.env.QYXY_CLIENT_ID,
        client_secret: context.env.QYXY_CLIENT_SECRET,
      }),
    }).catch((err) => console.error("Qyxy token revoke failed:", err));
  }

  const cookieNames = cookieHeader
    .split(";")
    .map(s => s.split("=")[0].trim())
    .filter(Boolean);

  const expired = "Thu, 01 Jan 1970 00:00:00 GMT";
  const baseAttrs = `Path=/; Expires=${expired}; Max-Age=0; Secure; SameSite=None; HttpOnly`;

  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });

  for (const name of cookieNames) {
    headers.append("Set-Cookie", `${name}=; ${baseAttrs}`);
    if (hostname && hostname !== "localhost") {
      headers.append("Set-Cookie", `${name}=; Domain=${hostname}; ${baseAttrs}`);
      headers.append("Set-Cookie", `${name}=; Domain=.${hostname}; ${baseAttrs}`);
    }
  }

  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers,
  });
};
