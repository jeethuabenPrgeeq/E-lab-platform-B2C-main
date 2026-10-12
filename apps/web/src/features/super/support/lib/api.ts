'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';
import { fetchAll } from '../../lib/server-collection';
import { ME } from './shared';
import type { Ticket, TicketPriority, TicketStatus } from './types';

interface ServerTicket extends Omit<Ticket, 'id' | 'messages' | 'assignee'> {
  id: string;
  ref: string;
  assignee: { id: string; name: string } | string | null;
  messages?: Ticket['messages'];
}

const nameOf = (assignee: ServerTicket['assignee']) => (assignee && typeof assignee === 'object' ? assignee.name : assignee);

interface Agent {
  id: string;
  name: string;
  email: string;
}

const POLL_MS = 30_000;

export function useTickets() {
  const [raw, setRaw] = useState<ServerTicket[] | null>(null);
  const [threads, setThreads] = useState<Record<string, Ticket['messages']>>({});
  const [agents, setAgents] = useState<Agent[]>([]);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const refs = useRef(new Map<string, string>());
  const focused = useRef<string | null>(null);

  const loadThread = useCallback(async (dbId: string) => {
    try {
      const ticket = await adminApi<ServerTicket>(`/super/support/tickets/${dbId}`);
      if (ticket.messages) setThreads((current) => ({ ...current, [dbId]: ticket.messages! }));
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    try {
      setRaw(await fetchAll<ServerTicket>('/super/support/tickets'));
      setError('');
      if (focused.current) void loadThread(focused.current);
    } catch (err) {
      setError(errorText(err));
      setRaw((current) => current ?? []);
    }
  }, [loadThread]);

  useEffect(() => {
    void refresh();
    adminApi<Agent[]>('/super/support/agents').then(setAgents).catch(() => {});
    adminApi<{ user: { id: string; name: string } }>('/auth/me').then((data) => setMe({ id: data.user.id, name: data.user.name })).catch(() => {});
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  for (const item of raw ?? []) refs.current.set(item.ref, item.id);

  const display = (name: string | null) => (name && me && name === me.name ? ME : name);

  const items: Ticket[] = (raw ?? []).map((item) => ({
    ...item,
    id: item.ref,
    assignee: display(nameOf(item.assignee)),
    messages: (threads[item.id] ?? item.messages ?? []).map((message) => ({ ...message, author: display(message.author) ?? message.author })),
  }));

  const focus = useCallback(
    (ref: string | null) => {
      const dbId = ref ? refs.current.get(ref) ?? null : null;
      focused.current = dbId;
      if (dbId) void loadThread(dbId);
    },
    [loadThread],
  );

  const run = useCallback(async (ref: string, path: string, body: unknown) => {
    const dbId = refs.current.get(ref);
    if (!dbId) return;
    try {
      const updated = await adminApi<ServerTicket>(`/super/support/tickets/${dbId}${path}`, { method: 'POST', body });
      setRaw((current) => (current ? current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)) : current));
      if (updated.messages) setThreads((current) => ({ ...current, [dbId]: updated.messages! }));
      else void loadThread(dbId);
      setError('');
    } catch (err) {
      setError(errorText(err));
    }
  }, [loadThread]);

  const idOf = (name: string | null) => (name === null ? null : name === ME ? me?.id ?? null : agents.find((agent) => agent.name === name)?.id ?? null);

  const reply = useCallback((ref: string, body: string, then: 'open' | 'pending' | 'resolved') => run(ref, '/reply', { body, then }), [run]);
  const addNote = useCallback((ref: string, body: string) => run(ref, '/note', { body }), [run]);
  const setStatus = useCallback((ref: string, status: TicketStatus) => run(ref, '/status', { status }), [run]);
  const setPriority = useCallback((ref: string, priority: TicketPriority) => run(ref, '/priority', { priority }), [run]);
  const assign = useCallback((ref: string, assignee: string | null) => run(ref, '/assign', { assigneeId: idOf(assignee) }), [run, me, agents]);

  const agentNames = [ME, ...agents.filter((agent) => agent.id !== me?.id).map((agent) => agent.name)];

  return { items, loaded: raw !== null, error, clearError: () => setError(''), refresh, focus, agents: agentNames, reply, addNote, setStatus, setPriority, assign };
}
