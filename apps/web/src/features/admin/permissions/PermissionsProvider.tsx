'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminApi, errorText } from '@/features/admin/lib/api';
import { PERMISSION_LABEL } from '@/features/super/access/lib/shared';
import type { PermissionKey } from '@/features/super/access/lib/types';

export type PermissionRequirement = PermissionKey | readonly PermissionKey[];

type Status = 'loading' | 'ready' | 'error';

interface MyPermissions {
  roleId: string;
  roleName: string;
  permissions: PermissionKey[];
}

interface PermissionsValue {
  status: Status;
  roleName: string;
  error: string;
  has: (requirement?: PermissionRequirement) => boolean;
  reload: () => void;
}

const PermissionsContext = createContext<PermissionsValue>({
  status: 'ready',
  roleName: '',
  error: '',
  has: () => true,
  reload: () => undefined,
});

const toList = (requirement: PermissionRequirement): readonly PermissionKey[] => (typeof requirement === 'string' ? [requirement] : requirement);

export function permissionLabel(requirement: PermissionRequirement) {
  return toList(requirement)
    .map((key) => PERMISSION_LABEL[key] ?? key)
    .join(' or ');
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MyPermissions | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    adminApi<MyPermissions>('/admin/me/permissions')
      .then((next) => {
        if (!alive) return;
        setData(next);
        setStatus('ready');
        setError('');
      })
      .catch((err) => {
        if (!alive) return;
        setStatus((current) => (current === 'ready' ? current : 'error'));
        setError(errorText(err));
      });
    return () => {
      alive = false;
    };
  }, [nonce]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNonce((value) => value + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const value = useMemo<PermissionsValue>(() => {
    const granted = new Set(data?.permissions ?? []);
    return {
      status,
      roleName: data?.roleName ?? '',
      error,
      has: (requirement) => !requirement || toList(requirement).some((key) => granted.has(key)),
      reload,
    };
  }, [data, status, error, reload]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function usePermissionGate(requirement: PermissionRequirement) {
  const { status, has } = usePermissions();
  const allowed = status === 'ready' && has(requirement);
  return { allowed, title: allowed ? undefined : `Requires the “${permissionLabel(requirement)}” permission` };
}

export function Can({ permission, children, fallback = null }: { permission: PermissionRequirement; children: ReactNode; fallback?: ReactNode }) {
  const { allowed } = usePermissionGate(permission);
  return <>{allowed ? children : fallback}</>;
}
