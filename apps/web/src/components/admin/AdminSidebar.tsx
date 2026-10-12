'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { DASHBOARD, filterNavSections, isNavActive, isWithin, type NavItem, type NavLeaf, type RoleConfig } from './admin-nav';
import styles from './AdminShell.module.css';

interface AdminSidebarProps {
  config: RoleConfig;
  pathname: string;
  query: string;
  collapsed: boolean;
  onNavigate: () => void;
  onRequestExpand: () => void;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function initialOpenGroups(config: RoleConfig, pathname: string) {
  const open = new Set<string>();
  for (const section of config.sections) {
    for (const item of section.items) {
      if (item.children && isWithin(pathname, item.href)) open.add(item.href);
    }
  }
  return open;
}

export function AdminSidebar({ config, pathname, query, collapsed, onNavigate, onRequestExpand }: AdminSidebarProps) {
  const [openGroups, setOpenGroups] = useState(() => initialOpenGroups(config, pathname));
  const sections = useMemo(() => filterNavSections(config.sections, query), [config.sections, query]);
  const searching = query.trim().length > 0;

  const toggleGroup = (href: string) => {
    if (collapsed) {
      onRequestExpand();
      setOpenGroups((prev) => new Set(prev).add(href));
      return;
    }
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  };

  const renderLeaf = (leaf: NavLeaf, className: string, icon?: NavItem['icon']) => {
    const Icon = icon;
    const active = isNavActive(pathname, leaf.href, config.basePath);
    const content = (
      <>
        {Icon && <Icon className={styles.itemIcon} aria-hidden="true" />}
        <span className={styles.itemLabel}>{leaf.label}</span>
      </>
    );

    if (!leaf.ready) {
      return (
        <span className={cx(className, styles.itemDisabled)} aria-disabled="true" title={`${leaf.label} — not available yet`}>
          {content}
        </span>
      );
    }

    return (
      <Link
        href={leaf.href}
        className={cx(className, active && styles.itemActive)}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? leaf.label : undefined}
        onClick={onNavigate}
      >
        {content}
      </Link>
    );
  };

  return (
    <aside className={styles.sidebar} aria-label={`${config.label} navigation`}>
      <Link href={DASHBOARD} className={styles.brand} onClick={onNavigate}>
        <span className={styles.brandMark} aria-hidden="true">
          eL
        </span>
        <span className={styles.brandText}>
          <span className={styles.brandName}>eLab</span>
          <span className={styles.brandRole}>{config.label}</span>
        </span>
      </Link>

      <nav className={styles.nav}>
        {sections.length === 0 && <p className={styles.empty}>No matches for “{query.trim()}”</p>}
        {sections.map((section) => (
          <div key={section.title} className={styles.section}>
            <p className={styles.sectionTitle}>{section.title}</p>
            <ul className={styles.list}>
              {section.items.map((item) => {
                if (!item.children) {
                  return <li key={item.href}>{renderLeaf(item, styles.item, item.icon)}</li>;
                }

                const Icon = item.icon;
                const groupId = `nav-group-${item.href.replace(/[^a-z0-9]+/gi, '-')}`;
                const open = searching || openGroups.has(item.href);
                const active = isWithin(pathname, item.href);

                return (
                  <li key={item.href}>
                    <button
                      type="button"
                      className={cx(styles.item, active && collapsed && styles.itemActive)}
                      aria-expanded={open && !collapsed}
                      aria-controls={groupId}
                      title={collapsed ? item.label : undefined}
                      onClick={() => toggleGroup(item.href)}
                    >
                      <Icon className={styles.itemIcon} aria-hidden="true" />
                      <span className={styles.itemLabel}>{item.label}</span>
                      <ChevronRight className={cx(styles.chevron, open && styles.chevronOpen)} aria-hidden="true" />
                    </button>
                    {open && (
                      <ul id={groupId} className={styles.subList}>
                        {item.children.map((child) => (
                          <li key={child.href}>{renderLeaf(child, cx(styles.item, styles.subItem))}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}