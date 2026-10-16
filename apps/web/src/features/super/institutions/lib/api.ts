'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';
import type { InstitutionPermissionKey } from '../../access/lib/types';
import type { CreateInstitutionInput, InstituteAdmin, InstitutionDetail, InstitutionList, LearnerRef, UpdateInstitutionInput } from './types';

const BASE = '/super/institutions';

export type Outcome<T> = { ok: true; data: T } | { ok: false; error: string };

async function attempt<T>(run: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    return { ok: false, error: errorText(error) };
  }
}

export function useInstitutions() {
  const [data, setData] = useState<InstitutionList | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setData(await adminApi<InstitutionList>(BASE, { query: { pageSize: 100 } }));
      setError('');
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loaded: data !== null, error, clearError: () => setError(''), refresh };
}

export const institutionApi = {
  get: (id: string) => attempt(() => adminApi<InstitutionDetail>(`${BASE}/${id}`)),
  create: (input: CreateInstitutionInput) => attempt(() => adminApi<InstitutionDetail>(BASE, { method: 'POST', body: input })),
  update: (id: string, input: UpdateInstitutionInput) => attempt(() => adminApi<InstitutionDetail>(`${BASE}/${id}`, { method: 'PATCH', body: input })),
  setPermissions: (id: string, permissions: InstitutionPermissionKey[]) => attempt(() => adminApi<InstitutionDetail>(`${BASE}/${id}/permissions`, { method: 'PUT', body: { permissions } })),
  invite: (id: string, name: string, email: string) => attempt(() => adminApi<{ admin: InstituteAdmin; temporaryPassword: string }>(`${BASE}/${id}/admins`, { method: 'POST', body: { name, email } })),
  unlinked: () => attempt(() => adminApi<{ items: InstituteAdmin[] }>(`${BASE}/unlinked-admins`)),
  unlinkedLearners: (q: string) => attempt(() => adminApi<{ items: LearnerRef[] }>(`${BASE}/unlinked-learners`, { query: { q: q || undefined } })),
  linkLearner: (id: string, userId: string) => attempt(() => adminApi<InstitutionDetail>(`${BASE}/${id}/learners/link`, { method: 'POST', body: { userId } })),
  link: (id: string, userId: string) => attempt(() => adminApi<InstitutionDetail>(`${BASE}/${id}/admins/link`, { method: 'POST', body: { userId } })),
  revoke: (id: string, userId: string, reason: string) => attempt(() => adminApi<InstitutionDetail>(`${BASE}/${id}/admins/${userId}/revoke`, { method: 'POST', body: { reason } })),
  restore: (id: string, userId: string) => attempt(() => adminApi<InstitutionDetail>(`${BASE}/${id}/admins/${userId}/restore`, { method: 'POST' })),
};
