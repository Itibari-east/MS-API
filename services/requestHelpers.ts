import { APIResponse } from '@playwright/test';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export function authHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export function withQueryParams(url: string, params?: QueryParams) {
  if (!params) {
    return url;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url;
}

export function isJwtExpired(token?: string, clockSkewMs = 60_000): boolean {
  if (!token) {
    return true;
  }

  const parts = token.split('.');
  if (parts.length < 2) {
    return true;
  }

  const payloadText = Buffer.from(parts[1], 'base64url').toString('utf-8');
  const match = payloadText.match(/"exp"\s*:\s*(\d+)/);
  if (!match) {
    return true;
  }
  const exp = Number(match[1]);
  if (!Number.isFinite(exp)) {
    return true;
  }
  return Date.now() >= exp * 1000 - clockSkewMs;
}

export async function extractAuthToken(response: APIResponse): Promise<string> {
  const headers = response.headers();
  const headerCandidates = [
    headers.authorization,
    headers['x-authorization'],
    headers['x-access-token'],
    headers['access-token'],
    headers['auth-token'],
    headers.token,
  ].filter((value): value is string => Boolean(value));

  for (const value of headerCandidates) {
    const trimmed = value.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      return trimmed.slice(7).trim();
    }
    if (trimmed.length > 20) {
      return trimmed;
    }
  }

  const bodyText = await response.text();
  const bodyTokenMatch =
    bodyText.match(/"accessToken"\s*:\s*"([^"]+)"/) ??
    bodyText.match(/"token"\s*:\s*"([^"]+)"/) ??
    bodyText.match(/"sessionToken"\s*:\s*"([^"]+)"/);

  return bodyTokenMatch?.[1] ?? '';
}
