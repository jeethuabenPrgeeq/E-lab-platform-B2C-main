'use client';

import type { ReactNode } from 'react';
import type { AdminRole } from '@/features/admin/types';
import { useSession } from '@/features/auth/useSession';
import { AdminShell } from './AdminShell';

const ALLOWED: Record<AdminRole, readonly AdminRole[]> = {
  'super-admin': ['super-admin'],
  'platform-admin': ['platform-admin'],
  'content-manager': ['content-manager'],
};

export function AdminRouteGuard({ role, children }: { role: AdminRole; children: ReactNode }) {
  const session = useSession(ALLOWED[role]);
  if (!session) return null;
  return (
    <AdminShell role={role} email={session.email}>
      {children}
    </AdminShell>
  );
}