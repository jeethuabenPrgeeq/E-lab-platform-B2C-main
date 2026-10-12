'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';
import { DEFAULTS, FIELDS, KEYS, diff, normalize } from './shared';
import type { PlatformSettings, SectionKey, SectionMeta, SettingsState } from './types';

interface ServerSettings {
  values: PlatformSettings;
  meta: Record<SectionKey, { at: number | null; by: string | null }>;
}

export interface SaveResult {
  count: number;
  sections: SectionKey[];
  error: string | null;
}

const toState = (data: ServerSettings): SettingsState => ({
  values: { ...DEFAULTS, ...data.values },
  meta: Object.fromEntries(Object.entries(data.meta).map(([key, value]) => [key, { at: value.at ?? 0, by: value.by ?? '' }])) as Record<SectionKey, SectionMeta>,
});

export function useSettings() {
  const [state, setState] = useState<SettingsState | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setState(toState(await adminApi<ServerSettings>('/super/settings')));
      setError('');
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (draft: PlatformSettings): Promise<SaveResult> => {
      if (!state) return { count: 0, sections: [], error: null };
      const next = normalize(draft);
      const changed = diff(state.values, next);
      if (changed.length === 0) return { count: 0, sections: [], error: null };
      const sections = Array.from(new Set(changed.map((key) => FIELDS[key].section)));
      const saved: SectionKey[] = [];
      for (const section of sections) {
        const values = Object.fromEntries(KEYS.filter((key) => FIELDS[key].section === section).map((key) => [key, next[key]]));
        try {
          setState(toState(await adminApi<ServerSettings>(`/super/settings/${section}`, { method: 'PATCH', body: { values, confirm: true } })));
          saved.push(section);
        } catch (err) {
          const message = errorText(err);
          setError(message);
          return { count: changed.filter((key) => saved.includes(FIELDS[key].section)).length, sections: saved, error: message };
        }
      }
      setError('');
      return { count: changed.length, sections: saved, error: null };
    },
    [state],
  );

  return { values: state?.values ?? DEFAULTS, meta: state?.meta ?? null, loaded: state !== null, error, clearError: () => setError(''), refresh, save };
}
