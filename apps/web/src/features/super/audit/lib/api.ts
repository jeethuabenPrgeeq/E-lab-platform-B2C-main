'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';
import type { AuditEvent } from './types';

const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const POLL_MS = 60_000;

interface EventPage {
  items: AuditEvent[];
  total: number;
}

async function fetchEvents() {
  const items: AuditEvent[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await adminApi<EventPage>('/super/audit/events', { query: { range: '90d', page, pageSize: PAGE_SIZE } });
    items.push(...data.items.map((item) => ({ ...item, changes: item.changes ?? [], reason: item.reason ?? undefined })));
    if (items.length >= data.total || data.items.length < PAGE_SIZE) break;
  }
  return items;
}

export function useAuditLog() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setEvents(await fetchEvents());
      setError('');
    } catch (err) {
      setError(errorText(err));
      setEvents((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const actorNames = useMemo(
    () => Array.from(new Set((events ?? []).filter((event) => event.actor.role !== 'Unknown').map((event) => event.actor.name))).sort((a, b) => (a === 'System' ? 1 : b === 'System' ? -1 : a.localeCompare(b))),
    [events],
  );

  return { events: events ?? [], actorNames, loaded: events !== null, error, clearError: () => setError(''), refresh };
}
