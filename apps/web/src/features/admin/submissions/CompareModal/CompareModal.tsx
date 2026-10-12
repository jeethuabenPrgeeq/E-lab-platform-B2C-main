'use client';

import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { LANGUAGES, PROBLEMS, codeFor } from '../lib/data';
import type { FlagItem } from '../lib/flags';
import { cx, formatDateTime } from '../lib/shared';
import type { FlagDecision } from '../lib/types';
import styles from './CompareModal.module.css';

interface CompareModalProps {
  item: FlagItem;
  onDecide: (decision: FlagDecision | null) => void;
  onClose: () => void;
}

function CodePane({ title, meta, lines, shared }: { title: string; meta: string; lines: string[]; shared: Set<string> }) {
  return (
    <div className={styles.pane}>
      <div className={styles.paneHead}>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <pre className={styles.code}>
        {lines.map((line, index) => (
          <span key={index} className={cx(styles.line, line.trim() && shared.has(line.trim()) && styles.same)}>
            <span className={styles.lineNo} aria-hidden="true">
              {index + 1}
            </span>
            {line || ' '}
          </span>
        ))}
      </pre>
    </div>
  );
}

export function CompareModal({ item, onDecide, onClose }: CompareModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const { sub, match, decision } = item;

  const { left, right, shared, identical } = useMemo(() => {
    const original = codeFor(match).split('\n');
    const flagged = codeFor(sub, match).split('\n');
    const originalSet = new Set(original.map((line) => line.trim()).filter(Boolean));
    const flaggedSet = new Set(flagged.map((line) => line.trim()).filter(Boolean));
    const both = new Set([...originalSet].filter((line) => flaggedSet.has(line)));
    const nonEmpty = flagged.filter((line) => line.trim());
    return { left: original, right: flagged, shared: both, identical: nonEmpty.filter((line) => both.has(line.trim())).length / Math.max(1, nonEmpty.length) };
  }, [sub, match]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
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
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="cmp-title">
        <div className={styles.head}>
          <div>
            <h2 id="cmp-title" className={styles.title}>
              {`${PROBLEMS[sub.problem].title} · ${LANGUAGES[sub.language].name}`}
            </h2>
            <p className={styles.sub}>{`${sub.similarity}% similarity score · ${Math.round(identical * 100)}% of lines identical`}</p>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close comparison" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendSwatch} aria-hidden="true" />
          Highlighted lines appear in both submissions
        </div>

        <div className={styles.panes}>
          <CodePane title={`Earlier · ${match.id}`} meta={`${match.learner} · ${formatDateTime(match.t)}`} lines={left} shared={shared} />
          <CodePane title={`Flagged · ${sub.id}`} meta={`${sub.learner} · ${formatDateTime(sub.t)}`} lines={right} shared={shared} />
        </div>

        <div className={styles.footer}>
          {decision ? (
            <>
              <span className={styles.decided}>{`Marked as ${decision.decision === 'confirmed' ? 'plagiarism' : 'not plagiarism'}`}</span>
              <button type="button" className={styles.ghostButton} onClick={() => onDecide(null)}>
                Undo decision
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.ghostButton} onClick={() => onDecide('dismissed')}>
                Dismiss
              </button>
              <button type="button" className={cx(styles.primaryButton, styles.dangerButton)} onClick={() => onDecide('confirmed')}>
                Confirm plagiarism
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}