'use client';

import dynamic from 'next/dynamic';
import { AdminShell } from '@/components/admin/AdminShell';
import { useSession } from '@/features/auth/useSession';

const LearnerDashboard = dynamic(() => import('./LearnerDashboard'), { ssr: false });

const SuperAdminDashboard = dynamic(
  () => import('@/features/admin/dashboards/SuperAdminDashboard').then((mod) => mod.SuperAdminDashboard),
  { ssr: false },
);

const PlatformAdminDashboard = dynamic(
  () => import('@/features/admin/dashboards/PlatformAdminDashboard').then((mod) => mod.PlatformAdminDashboard),
  { ssr: false },
);

const InstituteAdminDashboard = dynamic(
  () => import('@/features/admin/dashboards/ContentManagerDashboard').then((mod) => mod.ContentManagerDashboard),
  { ssr: false },
);

export default function DashboardPage() {
  const session = useSession();

  if (!session) return null;

  if (session.role === 'super-admin') {
    return (
      <AdminShell role="super-admin" email={session.email}>
        <SuperAdminDashboard />
      </AdminShell>
    );
  }

  if (session.role === 'platform-admin') {
    return (
      <AdminShell role="platform-admin" email={session.email}>
        <PlatformAdminDashboard />
      </AdminShell>
    );
  }

  if (session.role === 'institute-admin') {
    return (
      <AdminShell role="institute-admin" email={session.email}>
        <InstituteAdminDashboard />
      </AdminShell>
    );
  }

  return <LearnerDashboard />;
}