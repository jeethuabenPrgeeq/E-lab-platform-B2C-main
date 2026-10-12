"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Code2, Layers, Tags } from "lucide-react";
import styles from "./RuntimeTabs.module.css";

const TABS = [
  { label: "Languages", href: "/runtimes/languages", icon: Code2 },
  { label: "Frameworks", href: "/runtimes/frameworks", icon: Layers },
  { label: "Docker Images", href: "/runtimes/images", icon: Box },
  { label: "Runtime Versions", href: "/runtimes/versions", icon: Tags },
] as const;

export function RuntimeTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.switch} aria-label="Runtime management">
      {TABS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
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