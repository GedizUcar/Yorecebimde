import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_BASE: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Constants.expoConfig?.extra as any)?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:4000';

const SESSION_KEY = 'yc.session';

type ApiResponse<T> = { data: T; meta?: unknown } | { error: { code: string; message: string } };

export class MobileApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync(SESSION_KEY).catch(() => null);
  return token ? { Cookie: token } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'Accept-Language': 'tr',
    ...(await authHeaders()),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || 'error' in json) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText };
    throw new MobileApiError(res.status, err.code, err.message);
  }
  // Set-Cookie'yi yakala (Better-Auth)
  const setCookie = res.headers.get('set-cookie');
  if (setCookie?.includes('yorecebimde.session')) {
    await SecureStore.setItemAsync(SESSION_KEY, setCookie).catch(() => undefined);
  }
  return json.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
}

export async function hasSession(): Promise<boolean> {
  const t = await SecureStore.getItemAsync(SESSION_KEY).catch(() => null);
  return !!t;
}
