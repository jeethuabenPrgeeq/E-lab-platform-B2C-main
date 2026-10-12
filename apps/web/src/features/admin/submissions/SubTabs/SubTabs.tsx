"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSearch, LayoutDashboard, ListChecks, RefreshCcw } from "lucide-react";
import styles from "./SubTabs.module.css";

const TABS = [
  { label: "Overview", href: "/submissions", icon: LayoutDashboard, exact: true },
  { label: "Submissions", href: "/submissions/list", icon: ListChecks, exact: false },
  { label: "Plagiarism Review", href: "/submissions/plagiarism", icon: FileSearch, exact: false },
  { label: "Rejudge", href: "/submissions/rejudge", icon: RefreshCcw, exact: false },
] as const;

export function SubTabs({ pending = 0, running = false }: { pending?: number; running?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={styles.switch} aria-label="Submission monitoring">
      {TABS.map(({ label, href, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className={`${styles.option} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined}>
            <Icon width={16} height={16} aria-hidden="true" />
            <span className={styles.label} data-label={label}>
              {label}
            </span>
            {href === "/submissions/plagiarism" && pending > 0 && (
              <span className={styles.count} aria-label={`${pending} pending`}>
                {pending}
              </span>
            )}
            {href === "/submissions/rejudge" && running && <span className={styles.dot} aria-label="Rejudge running" />}
          </Link>
        );
      })}
    </nav>
  );
}