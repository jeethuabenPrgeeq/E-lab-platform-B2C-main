'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, errorText } from '../../lib/api';
import { useOpsIdentity } from '../../lib/ops-team';
import type { ComponentId, DeclareInput, Incident, IncidentStatus, Postmortem, Severity } from './types';

interface ServerIncident extends Omit<Incident, 'id'> {
  id: string;
  ref: string;
  commanderId: string | null;
}

const POLL_MS = 30_000;

export function useIncidents() {
  const identity = useOpsIdentity();
  const [raw, setRaw] = useState<ServerIncident[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refs = useRef(new Map<string, string>());

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi<{ items: ServerIncident[] }>('/admin/incidents', { query: { scope: 'all' } });
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

  for (const item of raw ?? []) refs.current.set(item.ref, item.id);

  const items: Incident[] = (raw ?? []).map((item) => ({
    ...item,
    id: item.ref,
    commander: identity.display(item.commander, item.commanderId) ?? item.commander,
    updates: item.updates.map((update) => ({ ...update, author: identity.display(update.author) ?? update.author })),
  }));

  const upsert = (updated: ServerIncident) =>
    setRaw((current) => {
      if (!current) return [updated];
      return current.some((item) => item.id === updated.id) ? current.map((item) => (item.id === updated.id ? updated : item)) : [updated, ...current];
    });

  const run = useCallback(async (ref: string, path: string, body?: unknown) => {
    const id = refs.current.get(ref);
    if (!id) return;
    setBusy(true);
    try {
      upsert(await adminApi<ServerIncident>(`/admin/incidents/${id}${path}`, { method: 'POST', body: body ?? {} }));
      setError('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const declare = useCallback(
    async (input: DeclareInput) => {
      setBusy(true);
      try {
        const created = await adminApi<ServerIncident>('/admin/incidents', {
          method: 'POST',
          body: { title: input.title, severity: input.severity, components: input.components, commanderId: identity.idOf(input.commander), message: input.message },
        });
        refs.current.set(created.ref, created.id);
        upsert(created);
        setError('');
        return created.ref;
      } catch (err) {
        setError(errorText(err));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [identity],
  );

  const postUpdate = useCallback((ref: string, status: IncidentStatus, message: string, isPublic: boolean) => run(ref, '/updates', { status, message, public: isPublic }), [run]);
  const setSeverity = useCallback((ref: string, severity: Severity) => run(ref, '/severity', { severity }), [run]);
  const setCommander = useCallback((ref: string, commander: string) => run(ref, '/commander', { commanderId: identity.idOf(commander) }), [run, identity]);
  const toggleComponent = useCallback((ref: string, component: ComponentId, _label?: string) => run(ref, '/components', { component }), [run]);
  const reopen = useCallback((ref: string, reason = 'Reopened — looking for the cause again.') => run(ref, '/reopen', { reason }), [run]);
  const savePostmortem = useCallback((ref: string, postmortem: Omit<Postmortem, 'savedAt'>) => run(ref, '/postmortem', postmortem), [run]);

  return {
    items,
    loaded: raw !== null,
    error,
    busy,
    responders: identity.names,
    clearError: () => setError(''),
    refresh,
    declare,
    postUpdate,
    setSeverity,
    setCommander,
    toggleComponent,
    reopen,
    savePostmortem,
  };
}