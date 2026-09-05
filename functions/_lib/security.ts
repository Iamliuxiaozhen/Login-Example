const encoder = new TextEncoder();

export const supportedLocales = ['zh-cn', 'zh-hant', 'en-us'];

export function normalizeLocale(value: string | null) {
  return supportedLocales.includes(value || '') ? value : 'en-us';
}

export function readCookie(request: Request, name: string) {
  const match = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}

export async function signValue(data: object, secret: string) {
  const payload = toBase64Url(encoder.encode(JSON.stringify(data)));
  return `${payload}.${await signature(payload, secret)}`;
}

export async function verifyValue(value: string | null, secret: string) {
  if (!value || !secret) return null;
  const [payload, supplied] = value.split('.');
  if (!payload || !supplied || await signature(payload, secret) !== supplied) return null;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(decoded, char => char.charCodeAt(0))));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export function cookie(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export const clearCookie = (name: string) => `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
