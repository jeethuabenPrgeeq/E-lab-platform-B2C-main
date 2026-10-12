import type { ReactNode } from 'react';
import { AdminRouteGuard } from '@/components/admin/AdminRouteGuard';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <AdminRouteGuard role="super-admin">{children}</AdminRouteGuard>;
}