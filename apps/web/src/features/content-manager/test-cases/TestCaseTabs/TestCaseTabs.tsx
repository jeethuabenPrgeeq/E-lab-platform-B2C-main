"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, EyeOff, FileSearch, LayoutGrid } from "lucide-react";
import styles from "./TestCaseTabs.module.css";

const TABS = [
  { label: "Overview", href: "/test-case-preparation", icon: LayoutGrid },
  { label: "Sample Tests", href: "/test-case-preparation/sample", icon: Eye },
  { label: "Hidden Tests", href: "/test-case-preparation/hidden", icon: EyeOff },
  { label: "Source Checks", href: "/test-case-preparation/source-checks", icon: FileSearch },
] as const;

export function TestCaseTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.switch} aria-label="Test case management">
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = href === "/test-case-preparation" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className={`${styles.option} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined}>
            <Icon width={16} height={16} aria-hidden="true" />
            <span className={styles.label} data-label={label}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
