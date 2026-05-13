/**
 * API client — Yörecebimde NestJS backend için tip-güvenli fetch wrapper.
 *
 * Server Components için: `apiServer(...)` (auth cookie forward eder)
 * Client Components için: `apiClient(...)` (browser cookie otomatik gönderir)
 */
import 'server-only';
import { cookies } from 'next/headers';

// Server Components için: internal Docker network varsa onu tercih et (CF bypass, daha hızlı)
// Yoksa public API URL'i kullan (lokal dev veya Cloudflare üzerinden production).
const API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000';

type ApiError = {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
  requestId?: string;
};

type ApiSuccess<T> = {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

type ApiResponse<T> = ApiSuccess<T> | { error: ApiError };

export class ApiClientError extends Error {
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
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'tr',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...init.headers,
    },
    // Server Components için Next.js cache stratejisi
    cache: init.cache ?? 'no-store',
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || 'error' in json) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText };
    throw new ApiClientError(res.status, err);
  }

  return json.data;
}

/**
 * Server-side fetcher — Next.js Server Components ve Server Actions için.
 * Auth cookie'leri otomatik forward edilir.
 */
export const apiServer = {
  get: <T>(path: string, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, {
      ...init,
      method: 'POST',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  patch: <T>(path: string, body?: unknown, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, {
      ...init,
      method: 'PATCH',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  delete: <T>(path: string, init?: Omit<RequestInit, 'method' | 'body'>) =>
    request<T>(path, { ...init, method: 'DELETE' }),
};
