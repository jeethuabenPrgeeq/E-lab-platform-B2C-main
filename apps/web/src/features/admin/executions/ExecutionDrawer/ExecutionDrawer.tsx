'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { OUTCOME_META, cx, formatClock, formatMs } from '../lib/shared';
import type { Execution } from '../lib/types';
import styles from './ExecutionDrawer.module.css';

function Usage({ label, used, limit, unit, format }: { label: string; used: number; limit: number; unit: string; format: (value: number) => string }) {
  const ratio = limit ? Math.min(1, used / limit) : 0;
  const tone = ratio >= 1 ? 'danger' : ratio >= 0.75 ? 'warning' : 'success';
  return (
    <div className={styles.usage}>
      <div className={styles.usageHead}>
        <span>{label}</span>
        <span className={styles.usageValue}>{`${format(used)} / ${format(limit)}${unit}`}</span>
      </div>
      <div className={styles.track} role="meter" aria-label={label} aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cx(styles.fill, styles[`fill_${tone}`])} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export function ExecutionDrawer({ execution, onClose }: { execution: Execution; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const meta = OUTCOME_META[execution.outcome];

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

  const facts: [string, string][] = [
    ['Type', execution.kind === 'submit' ? 'Submission' : 'Run'],
    ['Language', execution.language],
    ['Learner', execution.learner],
    ['Worker', execution.worker],
    ['Started', `${new Date(execution.startedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${formatClock(execution.startedAt, true)}`],
    ['Exit code', execution.exitCode === null ? '—' : String(execution.exitCode)],
    ['Tests passed', `${execution.testsPassed} / ${execution.testsTotal}`],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="exec-drawer-title">
        <div className={styles.head}>
          <div>
            <h2 id="exec-drawer-title" className={styles.title}>
              {execution.id}
            </h2>
            <p className={styles.sub}>{execution.problem}</p>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close details" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <span className={cx(styles.badge, styles[`tone_${meta.tone}`])}>{meta.label}</span>

        <dl className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Resources</h3>
          {execution.outcome === 'sandbox' || execution.outcome === 'ce' ? (
            <p className={styles.note}>{execution.outcome === 'ce' ? 'The code did not compile, so it never ran.' : 'The sandbox failed before the code started.'}</p>
          ) : (
            <>
              <Usage label="Time" used={execution.durationMs} limit={execution.timeLimitMs} unit="" format={formatMs} />
              <Usage label="Memory" used={execution.memoryMb} limit={execution.memoryLimitMb} unit=" MB" format={(value) => `${value}`} />
            </>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>stdout</h3>
          <pre className={styles.output}>{execution.stdout || <span className={styles.empty}>No output</span>}</pre>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>stderr</h3>
          <pre className={cx(styles.output, execution.stderr && styles.outputError)}>{execution.stderr || <span className={styles.empty}>No output</span>}</pre>
        </section>
      </aside>
    </div>
  );
}