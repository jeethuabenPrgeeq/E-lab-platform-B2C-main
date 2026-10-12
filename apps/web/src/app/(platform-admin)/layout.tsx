import type { ReactNode } from 'react';
import { AdminRouteGuard } from '@/components/admin/AdminRouteGuard';

export default function PlatformAdminLayout({ children }: { children: ReactNode }) {
  return <AdminRouteGuard role="platform-admin">{children}</AdminRouteGuard>;
}