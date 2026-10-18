import { apiFetch } from '@/features/auth/apiFetch';
import { clearSession } from '@/features/auth/session';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  status: number;
  issues: string[];

  constructor(status: number, message: string, issues: string[] = []) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

type Query = Record<string, string | number | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

function buildUrl(path: string, query?: Query) {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const url = new URL(`${API_BASE}${path}`, origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function messageOf(body: unknown, status: number) {
  const raw = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(raw)) return raw.join(' ');
  if (typeof raw === 'string' && raw) return raw;
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 404) return 'Not found.';
  return 'Something went wrong. Please try again.';
}

export async function adminApi<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the API. Check that it is running.');
  }

  const body = await response.json().catch(() => null);

  if (response.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.assign('/login');
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }

  if (!response.ok) {
    const issues = Array.isArray((body as { issues?: unknown } | null)?.issues) ? ((body as { issues: string[] }).issues) : [];
    throw new ApiError(response.status, messageOf(body, response.status), issues);
  }

  return body as T;
}

export async function adminDownload(path: string, fallbackName: string) {
  let response: Response;
  try {
    response = await apiFetch(buildUrl(path), { method: 'GET' });
  } catch {
    throw new ApiError(0, 'Cannot reach the API. Check that it is running.');
  }
  if (response.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.assign('/login');
    throw new ApiError(401, 'Your session has expired. Please sign in again.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, messageOf(body, response.status));
  }
  const name = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function errorText(error: unknown) {
  if (error instanceof ApiError) return error.issues.length ? `${error.message} ${error.issues.join(' ')}` : error.message;
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
