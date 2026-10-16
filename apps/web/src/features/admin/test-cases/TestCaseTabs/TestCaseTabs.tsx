"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, EyeOff, FileSearch, LayoutGrid } from "lucide-react";
import { useTestCaseScope } from "../scope";
import styles from "./TestCaseTabs.module.css";

const TABS = [
  { label: "Overview", path: "", icon: LayoutGrid },
  { label: "Sample Tests", path: "/sample", icon: Eye },
  { label: "Hidden Tests", path: "/hidden", icon: EyeOff },
  { label: "Source Checks", path: "/source-checks", icon: FileSearch },
] as const;

export function TestCaseTabs() {
  const pathname = usePathname();
  const { basePath } = useTestCaseScope();

  return (
    <nav className={styles.switch} aria-label="Test case management">
      {TABS.map(({ label, path, icon: Icon }) => {
        const href = `${basePath}${path}`;
        const active = path === "" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
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
