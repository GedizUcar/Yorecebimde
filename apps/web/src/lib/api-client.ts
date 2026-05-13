/**
 * Browser-side API client — Client Components ve form submit'leri için.
 * Cookie'ler `credentials: 'include'` ile otomatik gönderilir.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type ApiError = {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
};
type ApiResponse<T> = { data: T; meta?: unknown } | { error: ApiError };

export class ClientApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ApiError['details'];

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'tr',
      ...init.headers,
    },
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || 'error' in json) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText };
    throw new ClientApiError(res.status, err);
  }
  return json.data;
}

type Opts = { headers?: Record<string, string> };

export const apiClient = {
  get: <T>(path: string, opts: Opts = {}) =>
    request<T>(path, { method: 'GET', ...(opts.headers ? { headers: opts.headers } : {}) }),
  post: <T>(path: string, body?: unknown, opts: Opts = {}) =>
    request<T>(path, {
      method: 'POST',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(opts.headers ? { headers: opts.headers } : {}),
    }),
  patch: <T>(path: string, body?: unknown, opts: Opts = {}) =>
    request<T>(path, {
      method: 'PATCH',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(opts.headers ? { headers: opts.headers } : {}),
    }),
  put: <T>(path: string, body?: unknown, opts: Opts = {}) =>
    request<T>(path, {
      method: 'PUT',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(opts.headers ? { headers: opts.headers } : {}),
    }),
  delete: <T>(path: string, opts: Opts = {}) =>
    request<T>(path, { method: 'DELETE', ...(opts.headers ? { headers: opts.headers } : {}) }),
};

/**
 * Multipart upload to an API endpoint. Browser → API → MinIO over the internal
 * Docker network (replaces the presigned-URL flow which needed a public
 * storage subdomain).
 */
export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: { 'Accept-Language': 'tr' },
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || 'error' in json) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText };
    throw new ClientApiError(res.status, err);
  }
  return json.data;
}
