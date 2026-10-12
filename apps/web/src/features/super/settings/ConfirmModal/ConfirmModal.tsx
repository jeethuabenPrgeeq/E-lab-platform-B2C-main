'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { cx } from '../lib/shared';
import styles from '../ui/modal.module.css';

export interface CriticalChange {
  label: string;
  before: string;
  after: string;
}

interface ConfirmModalProps {
  changes: CriticalChange[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({ changes, onCancel, onConfirm }: ConfirmModalProps) {
  const [agreed, setAgreed] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className={styles.modalHead}>
          <h2 id="confirm-title" className={styles.modalTitle}>
            {changes.length === 1 ? 'Confirm a sensitive change' : `Confirm ${changes.length} sensitive changes`}
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.form}>
          <p className={styles.hint}>These affect who can reach eLab or how safely admins sign in. They take effect for everyone as soon as you save, and are recorded as critical in the audit log.</p>
          <ul className={styles.criticalList}>
            {changes.map((change) => (
              <li key={change.label} className={styles.criticalItem}>
                <strong>{change.label}</strong>
                <span className={styles.criticalValues}>
                  <span>{change.before}</span>
                  <ArrowRight width={14} height={14} aria-label="changes to" />
                  <span className={styles.criticalAfter}>{change.after}</span>
                </span>
              </li>
            ))}
          </ul>
          <label className={styles.checkLine}>
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            I understand and want to apply these changes
          </label>
          <div className={styles.footer}>
            <button ref={cancelRef} type="button" className={styles.ghostButton} onClick={onCancel}>
              Go back
            </button>
            <button type="button" className={cx(styles.primaryButton, styles.dangerButton)} disabled={!agreed} onClick={onConfirm}>
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

