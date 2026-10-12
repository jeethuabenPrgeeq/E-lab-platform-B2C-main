'use client';

import { useCallback, useEffect, useState } from 'react';
import { appendAudit } from '../../audit/lib/data';
import { DEFAULTS, FIELDS, SECTION_LABEL, diff, normalize } from './shared';
import type { PlatformSettings, SectionKey, SettingsState } from './types';

const KEY = 'elab_super_settings_v1';
const HOUR = 3_600_000;
const DAY = 86_400_000;

function seed(now: number): SettingsState {
  return {
    values: DEFAULTS,
    meta: {
      general: { at: now - 41 * DAY, by: 'Lakshmi V' },
      signup: { at: now - 12 * DAY, by: 'Lakshmi V' },
      security: { at: now - 20 * HOUR, by: 'Lakshmi V' },
      billing: { at: now - 3 * DAY - 2 * HOUR, by: 'Lakshmi V' },
      execution: { at: now - 9 * DAY, by: 'Arvind Menon' },
      email: { at: now - 60 * DAY, by: 'You' },
    },
  };
}

function load(): SettingsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SettingsState;
      if (parsed && parsed.values && parsed.meta) return { values: { ...DEFAULTS, ...parsed.values }, meta: parsed.meta };
    }
  } catch {}
  return seed(Date.now());
}

function persist(state: SettingsState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  return state;
}

export function useSettings() {
  const [state, setState] = useState<SettingsState | null>(null);

  useEffect(() => {
    setState(load());
  }, []);

  const save = useCallback(
    (draft: PlatformSettings) => {
      if (!state) return { count: 0, sections: [] as SectionKey[] };
      const next = normalize(draft);
      const changed = diff(state.values, next);
      if (changed.length === 0) return { count: 0, sections: [] as SectionKey[] };
      const now = Date.now();
      const meta = { ...state.meta };
      const sections = Array.from(new Set(changed.map((key) => FIELDS[key].section)));
      for (const section of sections) {
        const keys = changed.filter((key) => FIELDS[key].section === section);
        const critical = keys.some((key) => FIELDS[key].critical?.(state.values[key], next[key]));
        appendAudit({
          action: 'settings.updated',
          summary: `Updated ${SECTION_LABEL[section]} settings`,
          category: 'settings',
          severity: critical ? 'critical' : 'notice',
          target: { type: 'Settings', id: section, label: SECTION_LABEL[section] },
          changes: keys.map((key) => ({ field: FIELDS[key].label, before: FIELDS[key].show(state.values[key]), after: FIELDS[key].show(next[key]) })),
        });
        meta[section] = { at: now, by: 'You' };
      }
      setState(persist({ values: next, meta }));
      return { count: changed.length, sections };
    },
    [state],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setState(seed(Date.now()));
  }, []);

  return { values: state?.values ?? DEFAULTS, meta: state?.meta ?? null, loaded: state !== null, save, reset };
}
