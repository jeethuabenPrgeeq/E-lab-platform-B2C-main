'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Users, ShieldCheck, Layers3, Upload, Library, ClipboardCheck, BarChart3, GraduationCap, LayoutDashboard, Send, FileUser } from 'lucide-react';
import styles from './institute.module.css';
export const PREFIX = '/institute-admin-preview';
export const menu = [
  { slug: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { slug: 'profile', label: 'Institution Profile', Icon: Building2 },
  { slug: 'users', label: 'User Management', Icon: Users },
  { slug: 'permissions', label: 'Coordinator Permissions', Icon: ShieldCheck },
  { slug: 'environment', label: 'Environment Setup', Icon: Layers3 },
  { slug: 'bulk-upload', label: 'Bulk User Upload', Icon: Upload },
  { slug: 'publishing', label: 'Publishing', Icon: Send },
  { slug: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { slug: 'content', label: 'Content Tools', Icon: Library },
  { slug: 'learners', label: 'Learner Assignment', Icon: GraduationCap },
  { slug: 'review', label: 'Review Workflow', Icon: ClipboardCheck },
  { slug: 'registration', label: 'Registration Preview', Icon: FileUser },
] as const;
export function InstituteAdminWorkspace({ children }: { children: ReactNode }) {
  const path = usePathname();
  return <div className={styles.workspace}>
    <aside className={styles.localNav} aria-label="Institute Admin preview navigation">
      <div className={styles.navTitle}><Building2 size={20}/> Institute Admin <small>UI PREVIEW</small></div>
      {menu.map(({ slug, label, Icon }) => <Link key={slug} href={slug === 'dashboard' ? PREFIX : `${PREFIX}/${slug}`} className={`${styles.navLink} ${(slug === 'dashboard' ? path === PREFIX : path === `${PREFIX}/${slug}`) ? styles.navActive : ''}`}><Icon size={17}/>{label}</Link>)}
    </aside>
    <div className={styles.workArea}>{children}</div>
  </div>;
}
