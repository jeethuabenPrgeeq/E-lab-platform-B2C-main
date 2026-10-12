'use client';

import { useCallback, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';
import { fetchAll, useServerCollection } from '../../lib/server-collection';
import type { InviteInput, PlatformUser, UserRole } from './types';

export interface Credential {
  email: string;
  password: string;
}

const base = '/super/learners';
const loadLearners = () => fetchAll<PlatformUser>(base);
const detail = (id: string) => `${base}/${id}`;

export function useUsers() {
  const store = useServerCollection<PlatformUser>(loadLearners, detail);
  const { apply, setError } = store;
  const [credentials, setCredentials] = useState<Credential[]>([]);

  const reload = useCallback(
    async (id: string) => {
      apply(await adminApi<PlatformUser>(detail(id)));
    },
    [apply],
  );

  const setStatus = useCallback(
    async (ids: string[], status: 'active' | 'suspended', reason?: string) => {
      const failures: string[] = [];
      for (const id of ids) {
        try {
          await adminApi(`/super/users/${id}/status`, { method: 'POST', body: reason ? { status, reason } : { status } });
          await reload(id);
        } catch (err) {
          failures.push(errorText(err));
        }
      }
      if (failures.length) setError(failures.length === 1 ? failures[0] : `${failures.length} accounts were not changed: ${failures[0]}`);
      return ids.length - failures.length;
    },
    [reload, setError],
  );

  const suspend = useCallback((ids: string[], reason: string) => setStatus(ids, 'suspended', reason), [setStatus]);
  const reactivate = useCallback((ids: string[]) => setStatus(ids, 'active'), [setStatus]);

  const issuePassword = useCallback(
    async (id: string) => {
      try {
        const result = await adminApi<{ learner: PlatformUser; credential: Credential }>(`${detail(id)}/temporary-password`, { method: 'POST', body: {} });
        apply(result.learner);
        setCredentials((current) => [result.credential, ...current.filter((item) => item.email !== result.credential.email)]);
        return null;
      } catch (err) {
        return errorText(err);
      }
    },
    [apply],
  );

  const invite = useCallback(
    async (input: InviteInput) => {
      try {
        const result = await adminApi<{ items: PlatformUser[]; skipped: string[]; credentials: Credential[] }>(`${base}/invite`, { method: 'POST', body: { emails: input.emails } });
        result.items.forEach(apply);
        setCredentials((current) => [...result.credentials, ...current]);
        if (result.skipped.length) setError(`Already registered, skipped: ${result.skipped.join(', ')}`);
        return result.items.length;
      } catch (err) {
        setError(errorText(err));
        return 0;
      }
    },
    [apply, setError],
  );

  const setRole = useCallback(async (_id: string, _role: UserRole) => 'Only learner accounts exist right now. Admins are managed under Admins & Permissions.', []);

  return {
    items: store.items,
    loaded: store.loaded,
    error: store.error,
    clearError: store.clearError,
    refresh: store.refresh,
    focus: store.focus,
    credentials,
    clearCredentials: () => setCredentials([]),
    setRole,
    suspend,
    reactivate,
    resetPassword: issuePassword,
    resendInvite: issuePassword,
    invite,
  };
}

export type UserStore = ReturnType<typeof useUsers>;
