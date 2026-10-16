'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';

export const LEARNERS = '/institute/learners';

export interface Learner {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'revoked';
  lastLoginAt: string | null;
  invitedByName: string | null;
  revokeReason: string | null;
  group: { id: string; name: string } | null;
  createdAt: string;
}

export interface LearnerGroup {
  id: string;
  name: string;
  learners: number;
}

export interface LearnerCounts {
  active: number;
  revoked: number;
  neverSignedIn: number;
}

export interface Credential {
  name: string;
  email: string;
  temporaryPassword: string;
}

export interface ImportResult {
  created: Credential[];
  skipped: { row: number; email: string; reason: string }[];
}

export type Outcome<T> = { ok: true; data: T } | { ok: false; error: string };

async function attempt<T>(task: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    return { ok: false, error: errorText(error) };
  }
}

export const learnerApi = {
  invite: (name: string, email: string, groupId: string | null = null) => attempt(() => adminApi<{ learner: Learner; temporaryPassword: string }>(LEARNERS, { method: 'POST', body: { name, email, groupId } })),
  import: (rows: { name: string; email: string }[], groupId: string | null = null) => attempt(() => adminApi<ImportResult>(`${LEARNERS}/import`, { method: 'POST', body: { rows, groupId } })),
  revoke: (id: string, reason: string) => attempt(() => adminApi<Learner>(`${LEARNERS}/${id}/revoke`, { method: 'POST', body: { reason } })),
  createGroup: (name: string) => attempt(() => adminApi<LearnerGroup>(`${LEARNERS}/groups`, { method: 'POST', body: { name } })),
  deleteGroup: (id: string) => attempt(() => adminApi<{ deleted: boolean }>(`${LEARNERS}/groups/${id}`, { method: 'DELETE' })),
  setGroup: (id: string, groupId: string | null) => attempt(() => adminApi<Learner>(`${LEARNERS}/${id}/group`, { method: 'POST', body: { groupId } })),
  restore: (id: string) => attempt(() => adminApi<Learner>(`${LEARNERS}/${id}/restore`, { method: 'POST' })),
};

export function useLearners(q: string, status: '' | 'active' | 'revoked') {
  const [data, setData] = useState<{ items: Learner[]; counts: LearnerCounts; groups: LearnerGroup[] } | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setData(await adminApi<{ items: Learner[]; counts: LearnerCounts; groups: LearnerGroup[] }>(LEARNERS, { query: { q: q || undefined, status: status || undefined } }));
      setError('');
    } catch (err) {
      setError(errorText(err));
    }
  }, [q, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items: data?.items ?? [], groups: data?.groups ?? [], counts: data?.counts ?? { active: 0, revoked: 0, neverSignedIn: 0 }, loaded: data !== null || Boolean(error), error, refresh };
}

export function parseLearnerRows(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = lines.map((line) => {
    const cells = line.split(/[,;\t]/).map((cell) => cell.trim().replace(/^"|"$/g, ''));
    const emailIndex = cells.findIndex((cell) => cell.includes('@'));
    if (emailIndex === -1) return { name: cells.join(' '), email: '' };
    const email = cells[emailIndex];
    const name = cells.filter((_, index) => index !== emailIndex).join(' ').trim();
    return { name, email };
  });
  const first = rows[0];
  if (first && !first.email && /name/i.test(first.name)) rows.shift();
  return rows;
}

export function credentialsCsv(rows: Credential[]) {
  const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  return ['name,email,temporary_password', ...rows.map((row) => [row.name, row.email, row.temporaryPassword].map(escape).join(','))].join('\n');
}
