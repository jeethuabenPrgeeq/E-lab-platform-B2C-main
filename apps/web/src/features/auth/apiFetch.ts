const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const options: RequestInit = { ...init, credentials: 'include' };
  const response = await fetch(input, options);

  if (response.status !== 401) return response;
  if (!(await refreshSession())) return response;

  return fetch(input, options);
}