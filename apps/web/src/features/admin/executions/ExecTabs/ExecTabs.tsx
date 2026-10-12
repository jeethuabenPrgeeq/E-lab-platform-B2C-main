"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, LayoutDashboard, ScrollText } from "lucide-react";
import styles from "./ExecTabs.module.css";

const TABS = [
  { label: "Overview", href: "/executions", icon: LayoutDashboard, exact: true },
  { label: "Execution Log", href: "/executions/log", icon: ScrollText, exact: false },
  { label: "Alerts", href: "/executions/alerts", icon: BellRing, exact: false },
] as const;

export function ExecTabs({ firing = 0 }: { firing?: number }) {
  const pathname = usePathname();

  return (
    <nav className={styles.switch} aria-label="Execution monitoring">
      {TABS.map(({ label, href, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className={`${styles.option} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined}>
            <Icon width={16} height={16} aria-hidden="true" />
            <span className={styles.label} data-label={label}>
              {label}
            </span>
            {href === "/executions/alerts" && firing > 0 && (
              <span className={styles.count} aria-label={`${firing} firing`}>
                {firing}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}