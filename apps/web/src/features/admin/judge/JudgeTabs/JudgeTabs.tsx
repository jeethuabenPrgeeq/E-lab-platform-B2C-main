"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListOrdered, Server, SlidersHorizontal } from "lucide-react";
import styles from "./JudgeTabs.module.css";

const TABS = [
  { label: "Workers", href: "/judge/workers", icon: Server, alias: "/judge" },
  { label: "Queue", href: "/judge/queue", icon: ListOrdered },
  { label: "Limits", href: "/judge/limits", icon: SlidersHorizontal },
] as const;

export function JudgeTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.switch} aria-label="Judge management">
      {TABS.map((tab) => {
        const { label, href, icon: Icon } = tab;
        const active = pathname === href || pathname.startsWith(`${href}/`) || ("alias" in tab && pathname === tab.alias);
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