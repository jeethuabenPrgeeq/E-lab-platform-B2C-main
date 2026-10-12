'use client';

import { useCallback } from 'react';
import { adminApi } from '@/features/admin/lib/api';
import { attempt, fetchAll, useServerCollection } from '../../lib/server-collection';
import type { AccessTier, ContentItem, Visibility } from './types';

const loadCatalog = () => fetchAll<ContentItem>('/super/catalog');
const detail = (id: string) => `/super/catalog/${id}`;

export function useCatalog() {
  const store = useServerCollection<ContentItem>(loadCatalog, detail);
  const { refresh, apply, setError } = store;

  const setTier = useCallback(
    async (ids: string[], tier: AccessTier) => {
      const result = await attempt(() => adminApi('/super/catalog/tier', { method: 'POST', body: { ids, tier } }));
      if (result.error) setError(result.error);
      await refresh();
    },
    [refresh, setError],
  );

  const setVisibility = useCallback(
    async (ids: string[], visibility: Visibility, reason: string | null) => {
      const result = await attempt(() => adminApi('/super/catalog/visibility', { method: 'POST', body: { ids, visibility, ...(reason ? { reason } : {}) } }));
      if (result.error) setError(result.error);
      await refresh();
    },
    [refresh, setError],
  );

  const toggleFeatured = useCallback(
    async (id: string): Promise<string | null> => {
      const result = await attempt(() => adminApi<ContentItem>(`/super/catalog/${id}/feature`, { method: 'POST' }));
      if (result.data) apply(result.data);
      return result.error;
    },
    [apply],
  );

  return { items: store.items, loaded: store.loaded, error: store.error, clearError: store.clearError, refresh, focus: store.focus, setTier, setVisibility, toggleFeatured };
}

export type CatalogStore = ReturnType<typeof useCatalog>;
