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
  const githubClientId = env.GITHUB_CLIENT_ID;
  const googleClientId = env.GOOGLE_CLIENT_ID;
  const microsoftClientId = env.MICROSOFT_CLIENT_ID;
  const githubRedirectUri = env.GITHUB_REDIRECT_URI;
  const googleRedirectUri = env.GOOGLE_REDIRECT_URI;
  const microsoftRedirectUri = env.MICROSOFT_REDIRECT_URI;
  if (!secret || !githubClientId || !googleClientId || !microsoftClientId || !githubRedirectUri || !googleRedirectUri || !microsoftRedirectUri) {
    return new Response(JSON.stringify({ error: 'missing_oauth_configuration' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const urls: Record<string, string> = {
    github: `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(githubClientId)}&redirect_uri=${encodeURIComponent(githubRedirectUri)}&state=${encodeURIComponent(state)}`,
    microsoft: `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=${encodeURIComponent(microsoftClientId)}&response_type=code&redirect_uri=${encodeURIComponent(microsoftRedirectUri)}&response_mode=query&scope=${encodeURIComponent('openid profile email User.Read')}&prompt=consent&state=${encodeURIComponent(state)}`,
    google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}&redirect_uri=${encodeURIComponent(googleRedirectUri)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&state=${encodeURIComponent(state)}`
  };
  if (!urls[provider]) return new Response('Unknown provider', { status: 404 });
  return new Response(null, { status: 302, headers: { Location: urls[provider], 'Set-Cookie': cookie('oauth_state', stateCookie, 600) } });
};
