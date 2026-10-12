'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Lock, ShieldAlert, X } from 'lucide-react';
import { CATEGORY_META, cx, formatAgo, formatDateTime } from '../lib/shared';
import type { AuditEvent } from '../lib/types';
import styles from './AuditDrawer.module.css';

interface AuditDrawerProps {
  event: AuditEvent;
  now: number;
  onClose: () => void;
}

export function AuditDrawer({ event, now, onClose }: AuditDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const cat = CATEGORY_META[event.category];

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const facts: [string, string][] = [
    ['When', `${formatDateTime(event.at, true)} · ${formatAgo(event.at, now)}`],
    ['Who', `${event.actor.name} · ${event.actor.role}`],
    ['Area', cat.label],
    ['Target', `${event.target.label} · ${event.target.type.replace('_', ' ')}${event.target.id !== event.target.label ? ` ${event.target.id}` : ''}`],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="audit-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{event.id}</span>
            <h2 id="audit-title" className={styles.title}>
              {event.summary}
            </h2>
            <div className={styles.badges}>
              <span className={cx(styles.badge, event.result === 'success' ? styles.tone_success : styles.tone_danger)}>{event.result === 'success' ? 'Succeeded' : 'Failed'}</span>
              <code className={styles.actionCode}>{event.action}</code>
              {event.sensitive && (
                <span className={styles.sensitive}>
                  <ShieldAlert width={14} height={14} aria-hidden="true" />
                  Sensitive
                </span>
              )}
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close event" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        {event.error && (
          <div className={styles.errorBox} role="note">
            <strong>Error</strong>
            <span>{event.error}</span>
          </div>
        )}

        <dl className={cx(styles.facts, styles.factsSingle)}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Changes</h3>
          {event.changes.length === 0 ? (
            <p className={styles.hint}>{event.result === 'failure' ? 'Nothing was changed because the action failed.' : 'This action did not change any stored fields.'}</p>
          ) : (
            <div className={styles.diffWrap}>
              <table className={styles.diff}>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Before</th>
                    <th>After</th>
                  </tr>
                </thead>
                <tbody>
                  {event.changes.map((change) => (
                    <tr key={change.field}>
                      <td className={styles.fieldName}>{change.field}</td>
                      <td>
                        <code className={styles.before}>{change.before}</code>
                      </td>
                      <td>
                        <code className={cx(styles.after, change.before === change.after && styles.same)}>{change.after}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Request</h3>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>IP address</dt>
              <dd className={styles.monoText}>{event.ip}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Browser</dt>
              <dd>{event.userAgent}</dd>
            </div>
            <div className={cx(styles.fact, styles.factWide)}>
              <dt>Request ID</dt>
              <dd className={styles.requestRow}>
                <span className={styles.monoText}>{event.requestId}</span>
                <button
                  type="button"
                  className={styles.copy}
                  onClick={() => navigator.clipboard?.writeText(event.requestId).then(() => setCopied(true), () => undefined)}
                  aria-label="Copy request ID"
                >
                  {copied ? <Check width={14} height={14} aria-hidden="true" /> : <Copy width={14} height={14} aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.section}>
          <button type="button" className={styles.rawToggle} aria-expanded={showRaw} onClick={() => setShowRaw((value) => !value)}>
            {showRaw ? 'Hide raw event' : 'Show raw event'}
          </button>
          {showRaw && <pre className={styles.raw}>{JSON.stringify({ ...event, at: new Date(event.at).toISOString() }, null, 2)}</pre>}
        </section>

        <p className={styles.lockNote}>
          <Lock width={14} height={14} aria-hidden="true" />
          Audit events are append-only and cannot be edited or deleted.
        </p>
      </aside>
    </div>
  );
}