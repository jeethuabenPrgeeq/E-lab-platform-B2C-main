'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorText, type Paged } from '../../lib/api';
import type { Technology, TechnologyInput } from './types';

export type MutationResult = { ok: true } | { ok: false; error: string };

export function useTechnologies(path = '/admin/technologies') {
  const [items, setItems] = useState<Technology[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi<Paged<Technology>>(path, { query: { pageSize: 100 } });
      setItems(data.items);
      setLoadError('');
    } catch (error) {
      setLoadError(errorText(error));
    } finally {
      setLoaded(true);
    }
  }, [path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (task: () => Promise<unknown>): Promise<MutationResult> => {
      try {
        await task();
        await refresh();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: errorText(error) };
      }
    },
    [refresh],
  );

  const create = useCallback((input: TechnologyInput) => run(() => adminApi('/admin/technologies', { method: 'POST', body: input })), [run]);

  const update = useCallback(
    (id: string, patch: Partial<TechnologyInput>) => {
      const body: Partial<TechnologyInput> = { ...patch };
      delete body.slug;
      return run(() => adminApi(`/admin/technologies/${id}`, { method: 'PATCH', body }));
    },
    [run],
  );

  const remove = useCallback((id: string) => run(() => adminApi(`/admin/technologies/${id}`, { method: 'DELETE' })), [run]);

  return { items, loaded, loadError, refresh, create, update, remove };
}

export function validateTechnology(input: TechnologyInput, items: Technology[], editingId?: string): Partial<Record<keyof TechnologyInput, string>> {
  const errors: Partial<Record<keyof TechnologyInput, string>> = {};
  const others = items.filter((item) => item.id !== editingId);
  const name = input.name.trim();
  const slug = input.slug.trim();

  if (name.length < 1) errors.name = 'Name is required';
  else if (name.length > 40) errors.name = 'Keep the name under 40 characters';
  else if (others.some((item) => item.name.toLowerCase() === name.toLowerCase())) errors.name = 'A technology with this name already exists';

  if (!editingId) {
    if (!slug) errors.slug = 'Slug is required';
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errors.slug = 'Use lowercase letters, numbers and single hyphens';
    else if (others.some((item) => item.slug === slug)) errors.slug = 'This slug is already used';
  }

  if (/\s/.test(input.runtimeImage.trim())) errors.runtimeImage = 'Image names cannot contain spaces';

  if (input.fileExtension.trim() && !/^\.[a-z0-9]+$/i.test(input.fileExtension.trim())) errors.fileExtension = 'Start with a dot, for example .py';

  if (input.description.length > 200) errors.description = 'Keep the description under 200 characters';

  return errors;
}
