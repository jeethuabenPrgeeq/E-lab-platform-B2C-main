'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { AdminRole } from '@/features/admin/types';
import { ROLE_CONFIG } from './admin-nav';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import styles from './AdminShell.module.css';

const MOBILE_QUERY = '(max-width: 1023px)';

interface AdminShellProps {
  role: AdminRole;
  email?: string;
  children: ReactNode;
}

export function AdminShell({ role, email, children }: AdminShellProps) {
  const config = ROLE_CONFIG[role];
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const toggleNav = useCallback(() => {
    if (window.matchMedia(MOBILE_QUERY).matches) {
      setDrawerOpen((open) => !open);
    } else {
      setCollapsed((value) => !value);
    }
  }, []);

  const expandNav = useCallback(() => setCollapsed(false), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className={styles.shell} data-collapsed={collapsed} data-drawer={drawerOpen}>
      <AdminSidebar
        config={config}
        pathname={pathname}
        query={query}
        collapsed={collapsed}
        onNavigate={closeDrawer}
        onRequestExpand={expandNav}
      />
      {drawerOpen && (
        <button type="button" className={styles.scrim} aria-label="Close navigation" onClick={closeDrawer} />
      )}
      <div className={styles.main}>
        <AdminTopbar
          config={config}
          query={query}
          onQueryChange={setQuery}
          onToggleNav={toggleNav}
          navExpanded={drawerOpen || !collapsed}
        />
        <main id="admin-content" className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}