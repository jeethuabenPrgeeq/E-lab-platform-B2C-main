'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';
import type { InstitutionPermissionKey } from '@/features/super/access/lib/types';

export const STAFF = '/institute/staff';

export type StaffPreset = 'lead' | 'staff';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  title: string;
  permissions: InstitutionPermissionKey[];
  groups: { id: string; name: string }[];
  status: 'active' | 'revoked';
  lastLoginAt: string | null;
  invitedByName: string | null;
  revokeReason: string | null;
  createdAt: string;
}

export interface StaffData {
  items: StaffMember[];
  groups: { id: string; name: string }[];
  permissions: InstitutionPermissionKey[];
  presets: Record<StaffPreset, InstitutionPermissionKey[]>;
}

export interface StaffInput {
  title: string;
  permissions: InstitutionPermissionKey[];
  groupIds: string[];
}

export type Outcome<T> = { ok: true; data: T } | { ok: false; error: string };

async function attempt<T>(task: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    return { ok: false, error: errorText(error) };
  }
}

export const staffApi = {
  invite: (input: StaffInput & { name: string; email: string }) => attempt(() => adminApi<{ staff: StaffMember; temporaryPassword: string }>(STAFF, { method: 'POST', body: input })),
  update: (id: string, input: Partial<StaffInput>) => attempt(() => adminApi<StaffMember>(`${STAFF}/${id}`, { method: 'PATCH', body: input })),
  revoke: (id: string, reason: string) => attempt(() => adminApi<StaffMember>(`${STAFF}/${id}/revoke`, { method: 'POST', body: { reason } })),
  restore: (id: string) => attempt(() => adminApi<StaffMember>(`${STAFF}/${id}/restore`, { method: 'POST' })),
};

export function useStaff() {
  const [data, setData] = useState<StaffData | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      setData(await adminApi<StaffData>(STAFF));
      setError('');
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loaded: data !== null || Boolean(error), error, refresh };
}