'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { RefreshCw, ShieldOff } from 'lucide-react';
import { permissionLabel, usePermissions, type PermissionRequirement } from '@/features/admin/permissions/PermissionsProvider';
import { DASHBOARD } from './admin-nav';
import styles from './NoAccess.module.css';

export function RouteGate({ requirement, children }: { requirement?: PermissionRequirement; children: ReactNode }) {
  const { status, has, error, reload, roleName } = usePermissions();
  if (!requirement) return <>{children}</>;
  if (status === 'loading') return null;
  if (status === 'error') {
    return (
      <section className={styles.panel} role="alert">
        <span className={styles.icon} aria-hidden="true">
          <ShieldOff width={28} height={28} />
        </span>
        <h1 className={styles.title}>We couldn’t check your access</h1>
        <p className={styles.text}>{error || 'The permissions service did not respond.'}</p>
        <button type="button" className={styles.button} onClick={reload}>
          <RefreshCw width={16} height={16} aria-hidden="true" />
          Try again
        </button>
      </section>
    );
  }
  if (has(requirement)) return <>{children}</>;
  return (
    <section className={styles.panel} aria-labelledby="no-access-title">
      <span className={styles.icon} aria-hidden="true">
        <ShieldOff width={28} height={28} />
      </span>
      <h1 id="no-access-title" className={styles.title}>
        You don’t have access to this page
      </h1>
      <p className={styles.text}>
        {`Your role${roleName ? ` (${roleName})` : ''} does not include the “${permissionLabel(requirement)}” permission. Ask a super admin to grant it.`}
      </p>
      <Link href={DASHBOARD} className={styles.button}>
        Back to dashboard
      </Link>
    </section>
  );
}
