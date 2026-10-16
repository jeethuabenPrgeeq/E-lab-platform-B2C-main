
import Link from "next/link";
import { FileSpreadsheet, PencilLine, Sparkles } from "lucide-react";
import styles from "./UploadModeSwitch.module.css";

type UploadMode = "manual" | "csv" | "ai";

interface UploadModeSwitchProps {
  active: UploadMode;
  basePath?: string;
}

export function UploadModeSwitch({
  active,
  basePath = "/content-import",
}: UploadModeSwitchProps) {
  const modes = [
    {
      key: "manual",
      label: "Manual entry",
      href: basePath,
      icon: PencilLine,
    },
    {
      key: "csv",
      label: "CSV upload",
      href: `${basePath}/csv`,
      icon: FileSpreadsheet,
    },
    {
      key: "ai",
      label: "AI generate",
      href: `${basePath}/ai`,
      icon: Sparkles,
    },
  ] as const;

  return (
    <nav className={styles.switch} aria-label="Upload method">
      {modes.map(({ key, label, href, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          className={`${styles.option} ${
            active === key ? styles.active : ""
          }`}
          aria-current={active === key ? "page" : undefined}
        >
          <Icon width={16} height={16} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
