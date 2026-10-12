'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Braces, Copy, ListFilter, X } from 'lucide-react';
import { CATEGORY_META, SEVERITY_META, cx, formatAgo, formatDateTime } from '../lib/shared';
import type { AuditEvent } from '../lib/types';
import styles from './EventDrawer.module.css';

interface EventDrawerProps {
  event: AuditEvent;
  events: AuditEvent[];
  now: number;
  onOpen: (id: string) => void;
  onShowRelated: (event: AuditEvent) => void;
  onClose: () => void;
}

export function EventDrawer({ event, events, now, onOpen, onShowRelated, onClose }: EventDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [flash, setFlash] = useState('');

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.querySelectorAll('[role="dialog"][aria-modal="true"]').length <= 1) onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(''), 2500);
    return () => window.clearTimeout(id);
  }, [flash]);

  const related = useMemo(
    () =>
      events.filter((item) => {
        if (item.id === event.id) return false;
        if (item.target.type === event.target.type && item.target.id === event.target.id) return true;
        return event.target.type === 'IP address' && item.ip === event.target.id;
      }),
    [events, event],
  );
  const sameIp = useMemo(() => (event.actor.role === 'Unknown' ? events.filter((item) => item.ip === event.ip && item.at >= now - 86_400_000).length : 0), [events, event, now]);

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFlash(done);
    } catch {
      setFlash('Copying is blocked in this browser');
    }
  };

  const sev = SEVERITY_META[event.severity];

  const facts: [string, string][] = [
    ['When', `${formatDateTime(event.at)} · ${formatAgo(event.at, now)}`],
    ['Done by', event.actor.email === '—' ? event.actor.name : `${event.actor.name} · ${event.actor.email}`],
    ['Role', event.actor.role === 'Unknown' ? 'Not signed in' : event.actor.role],
    ['IP address', event.ip],
    ['Location', event.location],
    ['Device', event.device],
    ['Action', event.action],
    ['Target', `${event.target.type} · ${event.target.id}`],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="event-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{event.id}</span>
            <h2 id="event-title" className={styles.title}>
              {event.summary}
            </h2>
            <div className={styles.badges}>
              <span className={cx(styles.badge, styles[`tone_${sev.tone}`])}>{sev.label}</span>
              <span className={cx(styles.badge, styles.tone_primary)}>{CATEGORY_META[event.category].label}</span>
              {event.outcome === 'failure' && <span className={cx(styles.badge, styles.tone_danger)}>Failed</span>}
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close event" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.actionBar}>
          <button type="button" className={styles.action} onClick={() => copy(event.id, `Copied ${event.id}`)}>
            <Copy width={16} height={16} aria-hidden="true" />
            Copy ID
          </button>
          <button type="button" className={styles.action} onClick={() => copy(JSON.stringify(event, null, 2), 'Copied the event as JSON')}>
            <Braces width={16} height={16} aria-hidden="true" />
            Copy as JSON
          </button>
          <button type="button" className={styles.action} onClick={() => onShowRelated(event)}>
            <ListFilter width={16} height={16} aria-hidden="true" />
            All events for this target
          </button>
        </div>

        {flash && (
          <p className={styles.flash} role="status">
            {flash}
          </p>
        )}

        <dl className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd className={label === 'Action' || label === 'IP address' ? styles.mono : undefined}>{value}</dd>
            </div>
          ))}
        </dl>

        {event.changes && event.changes.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>What changed</h3>
            <ul className={styles.changeList}>
              {event.changes.map((change) => (
                <li key={change.field} className={styles.changeRow}>
                  <span className={styles.changeField}>{change.field}</span>
                  <span className={styles.changeValues}>
                    <span className={styles.before}>{change.before}</span>
                    <ArrowRight width={14} height={14} aria-label="changed to" />
                    <span className={styles.after}>{change.after}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {event.reason && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{event.outcome === 'failure' ? 'Why it failed' : 'Reason given'}</h3>
            <p className={styles.reasonBox}>{event.reason}</p>
          </section>
        )}

        {sameIp > 1 && (
          <p className={styles.warnText}>{`${sameIp} events from ${event.ip} in the last 24 hours.`}</p>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{event.target.type === 'IP address' ? `Other events from ${event.target.id}` : `Other events for ${event.target.label}`}</h3>
          {related.length === 0 ? (
            <p className={styles.hint}>No other events for this target in the last 90 days.</p>
          ) : (
            <ol className={styles.timeline}>
              {related.slice(0, 6).map((item) => (
                <li key={item.id} className={styles.timelineItem} data-kind={item.severity === 'critical' ? 'report' : item.severity === 'notice' ? 'note' : 'reply'}>
                  <button type="button" className={styles.relatedLink} onClick={() => onOpen(item.id)}>
                    {item.summary}
                  </button>
                  <span className={styles.meta}>{`${item.actor.name} · ${formatAgo(item.at, now)}`}</span>
                </li>
              ))}
            </ol>
          )}
          {related.length > 6 && (
            <button type="button" className={styles.inlineLink} onClick={() => onShowRelated(event)}>
              {`See all ${related.length + 1} in the log`}
            </button>
          )}
        </section>

        <p className={styles.hint}>Audit entries are kept for 2 years and can’t be edited or deleted, including by super admins.</p>
      </aside>
    </div>
  );
}
