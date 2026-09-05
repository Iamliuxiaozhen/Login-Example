// @ts-nocheck
import { cookie, signValue } from './_lib/security';
export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const formData = await request.formData();
  const token = formData.get("cf-turnstile-response");

  if (!token) {
    return new Response(JSON.stringify({ success: false, error: "missing_token" }), { status: 400 });
  }

  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return new Response(JSON.stringify({ success: false, error: "missing_secret" }), { status: 500 });

  const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token }),
  });

  if (!verifyRes.ok) return new Response(JSON.stringify({ success: false, error: "verification_unavailable" }), { status: 502 });
  const result = await verifyRes.json();

  if (!result.success) {
    return new Response(JSON.stringify({ success: false, error: result["error-codes"] }), { status: 403 });
  }

  const sessionSecret = env.TURNSTILE_SESSION_SECRET || secret;
  const session = await signValue({ exp: Date.now() + 5 * 60 * 1000 }, sessionSecret);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie("turnstile_session", session, 300) },
  });
};
