"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, CircleCheck, ClipboardCheck, FilePen, Globe, List } from "lucide-react";
import styles from "./ProblemTabs.module.css";

const TABS = [
  { label: "All Problems", href: "/problems", icon: List },
  { label: "Draft", href: "/problems/draft", icon: FilePen },
  { label: "Technical Review", href: "/problems/review", icon: ClipboardCheck },
  { label: "Ready", href: "/problems/ready", icon: CircleCheck },
  { label: "Published", href: "/problems/published", icon: Globe },
  { label: "Deprecated", href: "/problems/deprecated", icon: Archive },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/problems") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProblemTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.switch} aria-label="Problem management">
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = isActive(pathname, href);
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
