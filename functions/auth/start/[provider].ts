// @ts-nocheck
import { cookie, normalizeLocale, readCookie, signValue, verifyValue } from '../../_lib/security';

export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
  const provider = String(params.provider || '').toLowerCase();
  const locale = normalizeLocale(new URL(request.url).searchParams.get('locale'));
  const secret = env.TURNSTILE_SESSION_SECRET || env.TURNSTILE_SECRET_KEY;
  const verification = await verifyValue(readCookie(request, 'turnstile_session'), secret);
  if (!verification) return Response.redirect(new URL(`/${locale}/?error=verification`, request.url), 302);

  const state = crypto.randomUUID();
  const stateCookie = await signValue({ state, provider, locale, exp: Date.now() + 10 * 60 * 1000 }, secret);
  const urls: Record<string, string> = {
    github: `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(env.GITHUB_CLIENT_ID || 'Ov23liriGTHyDb56siMT')}&state=${encodeURIComponent(state)}`,
    microsoft: `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=${encodeURIComponent(env.MICROSOFT_CLIENT_ID || '7bb3e9f8-cace-4a24-86a1-62f2696fed4c')}&response_type=code&redirect_uri=${encodeURIComponent(env.MICROSOFT_REDIRECT_URI || 'https://login-example.liuxiaozhen.dev/auth/microsoft')}&response_mode=query&scope=${encodeURIComponent('openid profile email User.Read')}&prompt=consent&state=${encodeURIComponent(state)}`,
    google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(env.GOOGLE_CLIENT_ID || '805290356269-vto4bacmf9tkbe4fi6rc5auspbgn829l.apps.googleusercontent.com')}&redirect_uri=${encodeURIComponent('https://login-example.liuxiaozhen.dev/auth/Google/')}&response_type=code&scope=${encodeURIComponent('openid email profile')}&state=${encodeURIComponent(state)}`
  };
  if (!urls[provider]) return new Response('Unknown provider', { status: 404 });
  return new Response(null, { status: 302, headers: { Location: urls[provider], 'Set-Cookie': cookie('oauth_state', stateCookie, 600) } });
};
