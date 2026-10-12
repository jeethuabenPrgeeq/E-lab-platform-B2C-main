'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, errorText } from '../../lib/api';
import { useOpsIdentity } from '../../lib/ops-team';
import type { ProblemReport, ResolutionType } from './types';

interface ServerReport extends Omit<ProblemReport, 'id'> {
  id: string;
  ref: string;
  assigneeId: string | null;
}

interface ListResponse {
  items: ServerReport[];
  total: number;
}

const POLL_MS = 30_000;

export function useProblemReports() {
  const identity = useOpsIdentity();
  const [raw, setRaw] = useState<ServerReport[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refs = useRef(new Map<string, string>());

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi<ListResponse>('/admin/problem-reports', { query: { pageSize: 100 } });
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

  const items: ProblemReport[] = (raw ?? []).map((item) => ({
    ...item,
    id: item.ref,
    assignee: identity.display(item.assignee, item.assigneeId),
    activity: item.activity.map((entry) => ({ ...entry, actor: identity.display(entry.actor) ?? entry.actor })),
  }));

  const run = useCallback(async (ref: string, path: string, body?: unknown) => {
    const id = refs.current.get(ref);
    if (!id) return;
    setBusy(true);
    try {
      const updated = await adminApi<ServerReport>(`/admin/problem-reports/${id}${path}`, { method: 'POST', body: body ?? {} });
      setRaw((current) => (current ? current.map((item) => (item.id === updated.id ? updated : item)) : current));
      setError('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const assign = useCallback((ref: string, assignee: string | null) => run(ref, '/assign', { assigneeId: identity.idOf(assignee) }), [run, identity]);
  const startReview = useCallback((ref: string) => run(ref, '/review'), [run]);
  const close = useCallback((ref: string, status: 'resolved' | 'rejected', type: ResolutionType, note: string) => run(ref, '/close', { status, type, note }), [run]);
  const reopen = useCallback((ref: string) => run(ref, '/reopen'), [run]);
  const reply = useCallback((ref: string, message: string) => run(ref, '/reply', { body: message }), [run]);
  const note = useCallback((ref: string, text: string) => run(ref, '/note', { body: text }), [run]);

  return { items, loaded: raw !== null, error, busy, clearError: () => setError(''), refresh, assign, startReview, close, reopen, reply, note };
}