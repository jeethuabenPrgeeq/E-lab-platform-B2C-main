import type { ReactNode } from 'react';
import { AdminRouteGuard } from '@/components/admin/AdminRouteGuard';

export default function ContentManagerLayout({ children }: { children: ReactNode }) {
  return <AdminRouteGuard role="content-manager">{children}</AdminRouteGuard>;
}
