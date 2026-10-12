'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, adminApi, errorText } from '@/features/admin/lib/api';

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

interface Page<T> {
  items: T[];
  total: number;
}

export interface Outcome<T> {
  data: T | null;
  error: string | null;
  issues: string[];
}

export async function fetchAll<T>(path: string, query: Record<string, string | number> = {}): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await adminApi<Page<T>>(path, { query: { ...query, page, pageSize: PAGE_SIZE } });
    items.push(...data.items);
    if (items.length >= data.total || data.items.length < PAGE_SIZE) break;
  }
  return items;
}

export async function attempt<T>(run: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { data: await run(), error: null, issues: [] };
  } catch (err) {
    return { data: null, error: errorText(err), issues: err instanceof ApiError ? err.issues : [] };
  }
}

export function useServerCollection<T extends { id: string }>(load: () => Promise<T[]>, detailPath?: (id: string) => string) {
  const [items, setItems] = useState<T[] | null>(null);
  const [details, setDetails] = useState<Record<string, unknown[]>>({});
  const [error, setError] = useState('');
  const loadRef = useRef(load);
  loadRef.current = load;
  const detailRef = useRef(detailPath);
  detailRef.current = detailPath;
  const focused = useRef<string | null>(null);

  const loadDetail = useCallback(
    async (id: string) => {
      if (!detailRef.current) return;
      try {
        const detail = await adminApi<T & { activity?: unknown[] }>(detailRef.current(id));
        if (detail.activity) setDetails((current) => ({ ...current, [id]: detail.activity! }));
      } catch {}
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      setItems(await loadRef.current());
      setError('');
      if (focused.current) void loadDetail(focused.current);
    } catch (err) {
      setError(errorText(err));
      setItems((current) => current ?? []);
    }
  }, [loadDetail]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const focus = useCallback(
    (id: string | null) => {
      focused.current = id;
      if (id) void loadDetail(id);
    },
    [loadDetail],
  );

  const apply = useCallback((updated: T) => {
    setItems((current) => {
      if (!current) return [updated];
      return current.some((item) => item.id === updated.id) ? current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)) : [updated, ...current];
    });
    const activity = (updated as T & { activity?: unknown[] }).activity;
    if (activity) setDetails((current) => ({ ...current, [updated.id]: activity }));
  }, []);

  const drop = useCallback((id: string) => setItems((current) => (current ? current.filter((item) => item.id !== id) : current)), []);

  const merged = (items ?? []).map((item) => ({ ...item, activity: details[item.id] ?? (item as T & { activity?: unknown[] }).activity ?? [] }) as T);

  return { items: merged, loaded: items !== null, error, setError, clearError: () => setError(''), refresh, focus, apply, drop };
}
