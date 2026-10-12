import { adminApi } from '../../lib/api';
import type { AuditEvent } from './types';

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

export async function fetchAuditEvents(): Promise<AuditEvent[]> {
  const events: AuditEvent[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await adminApi<{ items: AuditEvent[]; total: number }>('/admin/audit/events', { query: { range: '30d', page, pageSize: PAGE_SIZE } });
    events.push(...data.items);
    if (events.length >= data.total || data.items.length < PAGE_SIZE) break;
  }
  return events;
}