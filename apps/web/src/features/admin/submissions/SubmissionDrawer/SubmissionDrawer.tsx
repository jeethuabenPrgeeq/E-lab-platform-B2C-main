'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, LoaderCircle, RefreshCcw, X } from 'lucide-react';
import { usePermissionGate } from '../../permissions/PermissionsProvider';
import { LANGUAGES, MEMORY_LIMIT_MB, PROBLEMS, TIME_LIMIT_MS, codeFor, testsFor } from '../lib/data';
import { DIFFICULTY_META, VERDICT_META, cx, formatDateTime, formatMs } from '../lib/shared';
import type { DisplayVerdict, Override, Submission, Verdict } from '../lib/types';
import styles from './SubmissionDrawer.module.css';

interface SubmissionDrawerProps {
  sub: Submission;
  verdict: DisplayVerdict;
  override: Override | null;
  onRejudge: (sub: Submission) => void;
  onClose: () => void;
}

export function SubmissionDrawer({ sub, verdict, override, onRejudge, onClose }: SubmissionDrawerProps) {
  const judge = usePermissionGate('judge.manage');
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [rejudging, setRejudging] = useState(false);
  const [rejudged, setRejudged] = useState(false);
  const [copied, setCopied] = useState(false);
  const problem = PROBLEMS[sub.problem];
  const meta = VERDICT_META[verdict];
  const judging = verdict === 'judging';
  const tests = judging ? [] : testsFor(sub, verdict as Verdict);
  const code = codeFor(sub);

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

  useEffect(() => {
    if (!rejudging) return;
    const id = window.setTimeout(() => {
      onRejudge(sub);
      setRejudging(false);
      setRejudged(true);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [rejudging, onRejudge, sub]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const facts: [string, string][] = [
    ['Learner', sub.learner],
    ['Language', LANGUAGES[sub.language].name],
    ['Difficulty', DIFFICULTY_META[problem.difficulty].label],
    ['Attempt', `#${sub.attempt}`],
    ['Submitted', formatDateTime(sub.t)],
    ['Tests passed', judging ? '—' : `${verdict === 'ac' ? sub.testsTotal : tests.filter((test) => test.status === 'pass').length} / ${sub.testsTotal}`],
    ['Run time', judging || verdict === 'ce' ? '—' : `${formatMs(sub.runtimeMs)} / ${formatMs(TIME_LIMIT_MS)}`],
    ['Memory', judging || verdict === 'ce' ? '—' : `${sub.memoryMb} / ${MEMORY_LIMIT_MB} MB`],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="sub-drawer-title">
        <div className={styles.head}>
          <div>
            <h2 id="sub-drawer-title" className={styles.title}>
              {sub.id}
            </h2>
            <p className={styles.sub}>{problem.title}</p>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close details" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.verdictRow}>
          <span className={cx(styles.badge, styles[`tone_${meta.tone}`])}>{meta.label}</span>
          {override && <span className={styles.rejudgedNote}>{`Rejudged · was ${VERDICT_META[override.from].short}`}</span>}
          {sub.similarity > 0 && <span className={cx(styles.badge, styles.tone_warning)}>{`${sub.similarity}% similar`}</span>}
          <button
            type="button"
            className={styles.action}
            disabled={judging || rejudging || !judge.allowed}
            title={judge.title}
            onClick={() => {
              setRejudged(false);
              setRejudging(true);
            }}
          >
            {rejudging ? (
              <LoaderCircle className={styles.spin} width={15} height={15} aria-hidden="true" />
            ) : rejudged ? (
              <Check width={15} height={15} aria-hidden="true" />
            ) : (
              <RefreshCcw width={15} height={15} aria-hidden="true" />
            )}
            {rejudging ? 'Rejudging…' : rejudged ? 'Rejudged' : 'Rejudge'}
          </button>
        </div>

        <dl className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {!judging && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Test cases</h3>
            <ol className={styles.tests}>
              {tests.map((test) => (
                <li key={test.index} className={styles.test} data-status={test.status}>
                  <span className={styles.testName}>
                    {`#${test.index}`}
                    <span className={styles.testKind}>{test.sample ? 'Sample' : 'Hidden'}</span>
                  </span>
                  <span className={styles.testStatus}>
                    {test.status === 'pass' ? 'Passed' : test.status === 'fail' ? VERDICT_META[verdict as Verdict].short : verdict === 'ce' ? 'Not compiled' : 'Not run'}
                  </span>
                  <span className={styles.testMeta}>{test.status === 'skipped' ? '—' : `${formatMs(test.timeMs)} · ${test.memoryMb} MB`}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Code</h3>
            <button
              type="button"
              className={styles.copy}
              onClick={() => {
                navigator.clipboard?.writeText(code).then(() => setCopied(true), () => undefined);
              }}
            >
              {copied ? <Check width={14} height={14} aria-hidden="true" /> : <Copy width={14} height={14} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className={styles.output}>{code}</pre>
        </section>
      </aside>
    </div>
  );
}