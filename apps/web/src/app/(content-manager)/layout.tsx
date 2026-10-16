import type { ReactNode } from 'react';
import { AdminRouteGuard } from '@/components/admin/AdminRouteGuard';

export default function InstituteAdminLayout({ children }: { children: ReactNode }) {
  return <AdminRouteGuard role="institute-admin">{children}</AdminRouteGuard>;
}
