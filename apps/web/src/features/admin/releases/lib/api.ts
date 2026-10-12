'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, errorText } from '../../lib/api';
import { useOpsIdentity } from '../../lib/ops-team';
import { compareVersions } from './shared';
import type { Release, ReleaseInput } from './types';

interface ServerRelease extends Release {
  ownerId: string | null;
  stageMinutes: number;
}

const POLL_MS = 15_000;

export function currentLive(items: Release[]) {
  return items.filter((item) => item.status === 'live').sort((a, b) => compareVersions(b.version, a.version))[0] ?? null;
}

export function activeRollout(items: Release[]) {
  return items.find((item) => item.status === 'rolling' || item.status === 'paused') ?? null;
}

export function useReleases() {
  const identity = useOpsIdentity();
  const [raw, setRaw] = useState<ServerRelease[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const itemsRef = useRef<Release[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi<{ items: ServerRelease[] }>('/admin/releases');
      setRaw(data.items);
      setError('');
    } catch (err) {
      setError(errorText(err));
      setRaw((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const items: Release[] = (raw ?? []).map((item) => ({
    ...item,
    owner: identity.display(item.owner, item.ownerId) ?? item.owner,
    events: item.events.map((event) => ({ ...event, actor: identity.display(event.actor) ?? event.actor })),
  }));
  itemsRef.current = items;

  const upsert = (updated: ServerRelease) =>
    setRaw((current) => {
      if (!current) return [updated];
      return current.some((item) => item.id === updated.id) ? current.map((item) => (item.id === updated.id ? updated : item)) : [updated, ...current];
    });

  const run = useCallback(async (id: string, path: string, body?: unknown) => {
    setBusy(true);
    try {
      upsert(await adminApi<ServerRelease>(`/admin/releases/${id}${path}`, { method: 'POST', body: body ?? {} }));
      setError('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const create = useCallback(
    async (input: ReleaseInput) => {
      setBusy(true);
      try {
        const created = await adminApi<ServerRelease>('/admin/releases', {
          method: 'POST',
          body: { version: input.version, title: input.title, type: input.type, ownerId: identity.idOf(input.owner), changes: input.changes },
        });
        upsert(created);
        setError('');
        return created.id;
      } catch (err) {
        setError(errorText(err));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [identity],
  );

  const toggleCheck = useCallback((id: string, checkId: string) => run(id, `/checklist/${checkId}`), [run]);
  const schedule = useCallback((id: string, at: number) => run(id, '/schedule', { at }), [run]);
  const unschedule = useCallback((id: string) => run(id, '/unschedule'), [run]);
  const start = useCallback((id: string) => run(id, '/start'), [run]);
  const pause = useCallback((id: string) => run(id, '/pause'), [run]);
  const resume = useCallback((id: string) => run(id, '/resume'), [run]);
  const promote = useCallback((id: string) => run(id, '/promote'), [run]);
  const rollback = useCallback((id: string, reason: string) => run(id, '/rollback', { reason }), [run]);

  return {
    items,
    loaded: raw !== null,
    itemsRef,
    error,
    busy,
    owners: identity.names,
    clearError: () => setError(''),
    refresh,
    create,
    toggleCheck,
    schedule,
    unschedule,
    start,
    pause,
    resume,
    promote,
    rollback,
  };
}