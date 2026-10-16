"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";
import { logoutRequest } from "@/features/auth/api";
import { clearSession } from "@/features/auth/session";
import { usePermissions } from "@/features/admin/permissions/PermissionsProvider";
import type { RoleConfig } from "./admin-nav";
import styles from "./AdminShell.module.css";

interface AdminTopbarProps {
  config: RoleConfig;
  email?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onToggleNav: () => void;
  navExpanded: boolean;
}

export function AdminTopbar({ config, email, query, onQueryChange, onToggleNav, navExpanded }: AdminTopbarProps) {
  const router = useRouter();
  const { staff, roleName } = usePermissions();
  const label = staff && roleName ? roleName : config.label;
  const initials =
    staff && roleName
      ? roleName
          .split(/\s+/)
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : config.initials;

  const logout = async () => {
    await logoutRequest();
    clearSession();
    router.replace("/login");
  };

  return (
    <header className={styles.topbar}>
      <button type="button" className={styles.iconButton} aria-label={navExpanded ? "Collapse navigation" : "Expand navigation"} aria-expanded={navExpanded} onClick={onToggleNav}>
        <Menu width={20} height={20} aria-hidden="true" />
      </button>

      <div className={styles.search} role="search">
        <Search className={styles.searchIcon} aria-hidden="true" />
        <label htmlFor="admin-nav-search" className={styles.visuallyHidden}>
          Search navigation
        </label>
        <input id="admin-nav-search" type="search" className={styles.searchInput} placeholder="Search navigation" autoComplete="off" value={query} onChange={(event) => onQueryChange(event.target.value)} />
      </div>

      <div className={styles.topbarEnd}>
        <span className={styles.roleChip}>{label}</span>
        <span className={styles.avatar} aria-label={email || label} title={email || label} role="img">
          {initials}
        </span>
        <button type="button" className={styles.iconButton} aria-label="Log out" title="Log out" onClick={logout}>
          <LogOut width={18} height={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
