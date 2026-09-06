// @ts-nocheck
import { cookie, normalizeLocale, readCookie, signValue, verifyValue } from '../../_lib/security';

export const onRequestGet: PagesFunction = async ({ request, env, params }) => {
  const provider = String(params.provider || '').toLowerCase();
  const locale = normalizeLocale(new URL(request.url).searchParams.get('locale'));
  const providerConfig: Record<string, { clientId?: string; clientSecret?: string; redirectUri?: string }> = {
    github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET, redirectUri: env.GITHUB_REDIRECT_URI },
    microsoft: { clientId: env.MICROSOFT_CLIENT_ID, clientSecret: env.MICROSOFT_CLIENT_SECRET, redirectUri: env.MICROSOFT_REDIRECT_URI },
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: env.GOOGLE_REDIRECT_URI }
  };
  if (!providerConfig[provider]) return new Response('Unknown provider', { status: 404 });

  const selectedProvider = providerConfig[provider];
  if (!selectedProvider.clientId || !selectedProvider.clientSecret || !selectedProvider.redirectUri || !env.TURNSTILE_SECRET_KEY || !(env.TURNSTILE_SESSION_SECRET || env.TURNSTILE_SECRET_KEY)) {
    return Response.redirect(new URL(`/${locale}/?error=configuration&provider=${encodeURIComponent(provider)}`, request.url), 302);
  }

  const secret = env.TURNSTILE_SESSION_SECRET || env.TURNSTILE_SECRET_KEY;
  const verification = await verifyValue(readCookie(request, 'turnstile_session'), secret);
  if (!verification) return Response.redirect(new URL(`/${locale}/?error=verification`, request.url), 302);

  const state = crypto.randomUUID();
  const stateCookie = await signValue({ state, provider, locale, exp: Date.now() + 10 * 60 * 1000 }, secret);
  const urls: Record<string, string> = {
    github: `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(selectedProvider.clientId)}&redirect_uri=${encodeURIComponent(selectedProvider.redirectUri)}&state=${encodeURIComponent(state)}`,
    microsoft: `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?client_id=${encodeURIComponent(selectedProvider.clientId)}&response_type=code&redirect_uri=${encodeURIComponent(selectedProvider.redirectUri)}&response_mode=query&scope=${encodeURIComponent('openid profile email User.Read')}&prompt=consent&state=${encodeURIComponent(state)}`,
    google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(selectedProvider.clientId)}&redirect_uri=${encodeURIComponent(selectedProvider.redirectUri)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&state=${encodeURIComponent(state)}`
  };
  return new Response(null, { status: 302, headers: { Location: urls[provider], 'Set-Cookie': cookie('oauth_state', stateCookie, 600) } });
};
