'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';
import { fetchAll, useServerCollection } from '../../lib/server-collection';
import type { AdminAccount, AdminRole, InviteAdminInput, NewRoleInput, PermissionKey } from './types';

interface Credential {
  email: string;
  password: string;
}

const base = '/super/access';
const loadAdmins = () => fetchAll<AdminAccount>(`${base}/admins`);
const detail = (id: string) => `${base}/admins/${id}`;

export function useAdminDirectory() {
  const store = useServerCollection<AdminAccount>(loadAdmins, detail);
  const { apply, setError } = store;
  const [roles, setRoles] = useState<AdminRole[] | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);

  const loadRoles = useCallback(async () => {
    try {
      setRoles(await adminApi<AdminRole[]>(`${base}/roles`));
    } catch (err) {
      setError(errorText(err));
      setRoles((current) => current ?? []);
    }
  }, [setError]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const { refresh: refreshAdmins } = store;
  const refresh = useCallback(async () => {
    await Promise.all([refreshAdmins(), loadRoles()]);
  }, [refreshAdmins, loadRoles]);

  const act = useCallback(
    async (id: string, path: string, body: unknown = {}, rolesChanged = false) => {
      try {
        apply(await adminApi<AdminAccount>(`${detail(id)}/${path}`, { method: 'POST', body }));
        if (rolesChanged) void loadRoles();
        return null;
      } catch (err) {
        return errorText(err);
      }
    },
    [apply, loadRoles],
  );

  const setRole = useCallback((id: string, roleId: string) => act(id, 'role', { roleId }, true), [act]);
  const setScope = useCallback((id: string, scope: string) => act(id, 'scope', { scope }), [act]);
  const revoke = useCallback((id: string, reason: string) => act(id, 'revoke', { reason }, true), [act]);
  const restore = useCallback((id: string) => act(id, 'restore', {}, true), [act]);
  const resetMfa = useCallback((id: string) => act(id, 'reset-mfa'), [act]);
  const signOutEverywhere = useCallback((id: string) => act(id, 'sign-out'), [act]);

  const resendInvite = useCallback(
    async (id: string) => {
      try {
        const result = await adminApi<{ admin: AdminAccount; temporaryPassword: string }>(`${detail(id)}/resend-invite`, { method: 'POST', body: {} });
        apply(result.admin);
        setCredential({ email: result.admin.email, password: result.temporaryPassword });
        return null;
      } catch (err) {
        return errorText(err);
      }
    },
    [apply],
  );

  const invite = useCallback(
    async (input: InviteAdminInput) => {
      try {
        const result = await adminApi<{ admin: AdminAccount; temporaryPassword: string }>(`${base}/admins`, { method: 'POST', body: input });
        apply(result.admin);
        setCredential({ email: result.admin.email, password: result.temporaryPassword });
        void loadRoles();
        return null;
      } catch (err) {
        const message = errorText(err);
        setError(message);
        return message;
      }
    },
    [apply, loadRoles, setError],
  );

  const putRole = (role: AdminRole) => setRoles((current) => (current ?? []).some((item) => item.id === role.id) ? (current ?? []).map((item) => (item.id === role.id ? role : item)) : [...(current ?? []), role]);

  const savePermissions = useCallback(
    async (changes: Record<string, PermissionKey[]>) => {
      for (const [id, permissions] of Object.entries(changes)) {
        try {
          putRole(await adminApi<AdminRole>(`${base}/roles/${id}/permissions`, { method: 'PUT', body: { permissions } }));
        } catch (err) {
          const message = errorText(err);
          setError(message);
          return message;
        }
      }
      return null;
    },
    [setError],
  );

  const createRole = useCallback(
    async (input: NewRoleInput) => {
      try {
        const role = await adminApi<AdminRole>(`${base}/roles`, { method: 'POST', body: { name: input.name.trim(), description: input.description.trim(), copyFrom: input.copyFrom } });
        putRole(role);
        return role.id;
      } catch (err) {
        setError(errorText(err));
        return null;
      }
    },
    [setError],
  );

  const deleteRole = useCallback(async (id: string) => {
    try {
      await adminApi(`${base}/roles/${id}`, { method: 'DELETE' });
      setRoles((current) => (current ?? []).filter((item) => item.id !== id));
      return null;
    } catch (err) {
      return errorText(err);
    }
  }, []);

  return {
    admins: store.items,
    roles: roles ?? [],
    loaded: store.loaded && roles !== null,
    error: store.error,
    clearError: store.clearError,
    refresh,
    focus: store.focus,
    credential,
    clearCredential: () => setCredential(null),
    setRole,
    setScope,
    revoke,
    restore,
    resendInvite,
    resetMfa,
    signOutEverywhere,
    invite,
    savePermissions,
    createRole,
    deleteRole,
  };
}

export type AdminStore = ReturnType<typeof useAdminDirectory>;
