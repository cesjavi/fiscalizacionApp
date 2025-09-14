export const TOKEN_KEY = 'token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const API_BASE = (import.meta.env.VITE_API_BASE || '')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

export function buildUrl(path: string) {
  if (!path.startsWith('/')) path = `/${path}`;
  return API_BASE ? `${API_BASE}${path}` : path;
}

/** Fusiona headers (Record | string[][] | Headers) en un Headers seguro */
function mergeHeaders(
  base: HeadersInit | undefined,
  extra: HeadersInit | undefined
): Headers {
  const h = new Headers();
  if (base) new Headers(base).forEach((v, k) => h.set(k, v));
  if (extra) new Headers(extra).forEach((v, k) => h.set(k, v));
  return h;
}

/** POST JSON genérico */
export async function postJson<T = unknown>(
  path: string,
  body: unknown,
  headers?: HeadersInit
): Promise<{ ok: boolean; status: number; payload: T | string }> {
  const url = buildUrl(path);
  const finalHeaders = mergeHeaders(
    { 'Content-Type': 'application/json', Accept: 'application/json' },
    headers
  );

  const resp = await fetch(url, {
    method: 'POST',
    headers: finalHeaders,
    body: JSON.stringify(body),
  });

  const ct = resp.headers.get('content-type') || '';
  const payload = ct.includes('application/json')
    ? await resp.json()
    : await resp.text();

  return { ok: resp.ok, status: resp.status, payload: payload as T | string };
}

/** GET JSON genérico */
export async function getJson<T = unknown>(
  path: string,
  headers?: HeadersInit
): Promise<{ ok: boolean; status: number; payload: T | string }> {
  const url = buildUrl(path);
  const finalHeaders = mergeHeaders({ Accept: 'application/json' }, headers);

  const resp = await fetch(url, { headers: finalHeaders });

  const ct = resp.headers.get('content-type') || '';
  const payload = ct.includes('application/json')
    ? await resp.json()
    : await resp.text();

  return { ok: resp.ok, status: resp.status, payload: payload as T | string };
}
