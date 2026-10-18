"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { FileSpreadsheet, PencilLine, Sparkles, X } from "lucide-react";
import styles from "./NewProblemChooser.module.css";

interface Props {
  open: boolean;
  basePath: string;
  onClose: () => void;
  note?: string;
}

const OPTIONS = [
  { key: "manual", suffix: "", icon: PencilLine, title: "Manual entry", text: "Write one problem with its statement, example and hidden tests." },
  { key: "csv", suffix: "/csv", icon: FileSpreadsheet, title: "Bulk / CSV upload", text: "Upload many problems from a CSV file and fix any errors before saving." },
  { key: "ai", suffix: "/ai", icon: Sparkles, title: "AI generated", text: "Generate draft problems from a topic or source, then review and edit them." },
] as const;

export function NewProblemChooser({ open, basePath, onClose, note = "Everything you add starts as a draft in your Content Library." }: Props) {
  const firstRef = useRef<HTMLAnchorElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="new-problem-title">
        <header className={styles.header}>
          <div>
            <h2 id="new-problem-title" className={styles.title}>
              New problem
            </h2>
            <p className={styles.subtitle}>How would you like to add content?</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.options}>
          {OPTIONS.map(({ key, suffix, icon: Icon, title, text }, index) => (
            <Link key={key} ref={index === 0 ? firstRef : undefined} href={`${basePath}${suffix}`} className={styles.option} onClick={onClose}>
              <span className={styles.icon}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <span className={styles.optionText}>
                <strong>{title}</strong>
                <span>{text}</span>
              </span>
            </Link>
          ))}
        </div>

        <p className={styles.footnote}>{note}</p>
      </div>
    </div>
  );
}