'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, errorText } from '../../lib/api';
import { useOpsIdentity } from '../../lib/ops-team';
import type { Ticket, TicketPriority, TicketStatus } from './types';

interface ServerTicket extends Omit<Ticket, 'id'> {
  id: string;
  ref: string;
  assigneeId: string | null;
  escalatedTicketId: string | null;
}

interface ListResponse {
  items: ServerTicket[];
  total: number;
}

const POLL_MS = 30_000;

export function useTickets() {
  const identity = useOpsIdentity();
  const [raw, setRaw] = useState<ServerTicket[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refs = useRef(new Map<string, string>());

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi<ListResponse>('/admin/tech-support', { query: { pageSize: 100 } });
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

  const items: Ticket[] = (raw ?? []).map((item) => ({
    ...item,
    id: item.ref,
    assignee: identity.display(item.assignee, item.assigneeId),
    messages: item.messages.map((message) => ({ ...message, author: identity.display(message.author) ?? message.author })),
  }));

  const run = useCallback(async (ref: string, path: string, body?: unknown) => {
    const id = refs.current.get(ref);
    if (!id) return;
    setBusy(true);
    try {
      const updated = await adminApi<ServerTicket>(`/admin/tech-support/${id}${path}`, { method: 'POST', body: body ?? {} });
      setRaw((current) => (current ? current.map((item) => (item.id === updated.id ? updated : item)) : current));
      setError('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const reply = useCallback((ref: string, body: string, then: 'open' | 'pending' | 'resolved') => run(ref, '/reply', { body, status: then }), [run]);
  const addNote = useCallback((ref: string, body: string) => run(ref, '/note', { body }), [run]);
  const setStatus = useCallback((ref: string, status: TicketStatus) => run(ref, '/status', { status }), [run]);
  const setPriority = useCallback((ref: string, priority: TicketPriority) => run(ref, '/priority', { priority }), [run]);
  const assign = useCallback((ref: string, assignee: string | null) => run(ref, '/assign', { assigneeId: identity.idOf(assignee) }), [run, identity]);
  const escalate = useCallback((ref: string, note: string) => run(ref, '/escalate', { note }), [run]);

  return { items, loaded: raw !== null, error, busy, agents: identity.names, clearError: () => setError(''), refresh, reply, addNote, setStatus, setPriority, assign, escalate };
}