'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Bell, ExternalLink, FileText, Pencil, RotateCcw, Send, TicketCheck, X } from 'lucide-react';
import type { useIncidents } from '../lib/api';
import { COMPONENTS, SEVERITY_META, STATUS_FLOW, STATUS_META, cx, formatAgo, formatDateTime, formatSpan } from '../lib/shared';
import type { Incident, IncidentStatus, Severity } from '../lib/types';
import styles from './IncidentDrawer.module.css';

type Store = ReturnType<typeof useIncidents>;

interface IncidentDrawerProps {
  incident: Incident;
  now: number;
  store: Store;
  onClose: () => void;
}

const LINK_ICON = { alert: Bell, ticket: TicketCheck, report: FileText };

export function IncidentDrawer({ incident, now, store, onClose }: IncidentDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const resolved = incident.status === 'resolved';
  const nextStatus = STATUS_FLOW[Math.min(STATUS_FLOW.length - 1, STATUS_FLOW.indexOf(incident.status) + 1)];
  const [status, setStatus] = useState<IncidentStatus>(resolved ? 'resolved' : nextStatus);
  const [message, setMessage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState('');
  const [editingPm, setEditingPm] = useState(false);
  const [pm, setPm] = useState({ summary: incident.postmortem?.summary ?? '', rootCause: incident.postmortem?.rootCause ?? '', actions: incident.postmortem?.actions ?? '' });
  const [pmErrors, setPmErrors] = useState<{ summary?: string; rootCause?: string }>({});

  const sev = SEVERITY_META[incident.severity];
  const stepIndex = STATUS_FLOW.indexOf(incident.status);

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
    setStatus(resolved ? 'resolved' : nextStatus);
  }, [incident.status, resolved, nextStatus]);

  const submitUpdate = (event: FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 10) {
      setError('Write at least 10 characters — say what changed and what happens next');
      return;
    }
    store.postUpdate(incident.id, status, message.trim(), isPublic);
    setMessage('');
    setError('');
  };

  const submitPm = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof pmErrors = {};
    if (pm.summary.trim().length < 10) next.summary = 'Summarise the impact in at least 10 characters';
    if (pm.rootCause.trim().length < 10) next.rootCause = 'Describe the root cause in at least 10 characters';
    setPmErrors(next);
    if (next.summary || next.rootCause) return;
    store.savePostmortem(incident.id, { summary: pm.summary.trim(), rootCause: pm.rootCause.trim(), actions: pm.actions.trim() });
    setEditingPm(false);
  };

  const showPmForm = resolved && (editingPm || !incident.postmortem);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="incident-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{`${incident.id} · started ${formatDateTime(incident.startedAt)}`}</span>
            <h2 id="incident-title" className={styles.title}>
              {incident.title}
            </h2>
            <div className={styles.badges}>
              <span className={cx(styles.sevBadge, styles[`tone_${sev.tone}`])}>{sev.label}</span>
              <span className={cx(styles.badge, styles[`tone_${STATUS_META[incident.status].tone}`])}>{STATUS_META[incident.status].label}</span>
              <span className={cx(styles.duration, !resolved && styles.durationLive)}>
                {resolved ? `Lasted ${formatSpan((incident.resolvedAt ?? now) - incident.startedAt)}` : `Running ${formatSpan(now - incident.startedAt)}`}
              </span>
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close incident" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <ol className={styles.stepper} aria-label="Incident progress">
          {STATUS_FLOW.map((item, index) => (
            <li key={item} className={cx(styles.step, index <= stepIndex && styles.stepDone, index === stepIndex && styles.stepCurrent)} aria-current={index === stepIndex ? 'step' : undefined}>
              <span className={styles.stepDot} aria-hidden="true" />
              <span className={styles.stepLabel}>{STATUS_META[item].label}</span>
            </li>
          ))}
        </ol>

        <div className={styles.controls}>
          <label className={styles.field}>
            <span className={styles.label}>Severity</span>
            <select className={styles.control} value={incident.severity} disabled={resolved} onChange={(event) => store.setSeverity(incident.id, event.target.value as Severity)}>
              {Object.entries(SEVERITY_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Incident commander</span>
            <select className={styles.control} value={incident.commander} disabled={resolved} onChange={(event) => store.setCommander(incident.id, event.target.value)}>
              {store.responders.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Affected components</h3>
          <div className={styles.chips}>
            {COMPONENTS.map((item) => {
              const on = incident.components.includes(item.id);
              const last = on && incident.components.length === 1;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cx(styles.chip, on && styles.chipOn)}
                  aria-pressed={on}
                  disabled={resolved || last}
                  title={last ? 'An incident needs at least one component' : undefined}
                  onClick={() => store.toggleComponent(incident.id, item.id, item.label)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        {incident.links.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Linked</h3>
            <div className={styles.links}>
              {incident.links.map((link) => {
                const Icon = LINK_ICON[link.kind];
                return (
                  <Link key={link.label} href={link.href} className={styles.linkPill}>
                    <Icon width={14} height={14} aria-hidden="true" />
                    {link.label}
                    <ExternalLink width={12} height={12} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {!resolved ? (
          <form className={styles.closeForm} onSubmit={submitUpdate} noValidate>
            <h3 className={styles.sectionTitle}>Post an update</h3>
            <label className={styles.field}>
              <span className={styles.label}>Status after this update</span>
              <select className={styles.control} value={status} onChange={(event) => setStatus(event.target.value as IncidentStatus)}>
                {STATUS_FLOW.map((item) => (
                  <option key={item} value={item}>
                    {`${STATUS_META[item].label} — ${STATUS_META[item].hint}`}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Message</span>
              <textarea
                className={cx(styles.control, styles.textarea, error && styles.controlError)}
                value={message}
                placeholder={status === 'resolved' ? 'Confirm what was fixed and that service is back to normal…' : 'What changed and what happens next?'}
                onChange={(event) => {
                  setMessage(event.target.value);
                  if (error) setError('');
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby="update-msg"
              />
              <span id="update-msg" className={error ? styles.errorText : styles.hint}>
                {error || (isPublic ? 'Institutions see this on the status page' : 'Only responders see this update')}
              </span>
            </label>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
              Publish to the status page
            </label>
            <div className={styles.formActions}>
              <button type="submit" className={cx(styles.primaryButton, status === 'resolved' && styles.successButton)}>
                <Send width={15} height={15} aria-hidden="true" />
                {status === 'resolved' ? 'Post and resolve' : 'Post update'}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.resolvedBar}>
            <span>{`Resolved ${incident.resolvedAt ? formatAgo(incident.resolvedAt, now) : ''}`}</span>
            <button type="button" className={styles.action} onClick={() => store.reopen(incident.id)}>
              <RotateCcw width={16} height={16} aria-hidden="true" />
              Reopen
            </button>
          </div>
        )}

        {resolved && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>Postmortem</h3>
              {incident.postmortem && !editingPm && (
                <button type="button" className={styles.action} onClick={() => setEditingPm(true)}>
                  <Pencil width={15} height={15} aria-hidden="true" />
                  Edit
                </button>
              )}
            </div>
            {showPmForm ? (
              <form className={styles.closeForm} onSubmit={submitPm} noValidate>
                {!incident.postmortem && incident.severity !== 'sev3' && <p className={styles.warnText}>SEV1 and SEV2 incidents need a postmortem.</p>}
                <label className={styles.field}>
                  <span className={styles.label}>Impact summary</span>
                  <textarea
                    className={cx(styles.control, styles.textarea, pmErrors.summary && styles.controlError)}
                    value={pm.summary}
                    onChange={(event) => setPm((current) => ({ ...current, summary: event.target.value }))}
                    placeholder="Who was affected, for how long, and how badly?"
                  />
                  {pmErrors.summary && <span className={styles.errorText}>{pmErrors.summary}</span>}
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Root cause</span>
                  <textarea
                    className={cx(styles.control, styles.textarea, pmErrors.rootCause && styles.controlError)}
                    value={pm.rootCause}
                    onChange={(event) => setPm((current) => ({ ...current, rootCause: event.target.value }))}
                    placeholder="What actually caused it?"
                  />
                  {pmErrors.rootCause && <span className={styles.errorText}>{pmErrors.rootCause}</span>}
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Action items</span>
                  <textarea
                    className={cx(styles.control, styles.textarea)}
                    value={pm.actions}
                    onChange={(event) => setPm((current) => ({ ...current, actions: event.target.value }))}
                    placeholder="One action per line"
                  />
                </label>
                <div className={styles.formActions}>
                  {editingPm && (
                    <button type="button" className={styles.ghostButton} onClick={() => setEditingPm(false)}>
                      Cancel
                    </button>
                  )}
                  <button type="submit" className={styles.primaryButton}>
                    {incident.postmortem ? 'Save changes' : 'Publish postmortem'}
                  </button>
                </div>
              </form>
            ) : incident.postmortem ? (
              <div className={styles.pmView}>
                <div>
                  <span className={styles.pmLabel}>Impact</span>
                  <p>{incident.postmortem.summary}</p>
                </div>
                <div>
                  <span className={styles.pmLabel}>Root cause</span>
                  <p>{incident.postmortem.rootCause}</p>
                </div>
                {incident.postmortem.actions && (
                  <div>
                    <span className={styles.pmLabel}>Action items</span>
                    <ul className={styles.pmActions}>
                      {incident.postmortem.actions.split('\n').filter(Boolean).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <span className={styles.meta}>{`Published ${formatDateTime(incident.postmortem.savedAt)}`}</span>
              </div>
            ) : null}
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Timeline</h3>
          <ol className={styles.timeline}>
            {incident.updates
              .slice()
              .reverse()
              .map((update) => (
                <li key={update.id} className={styles.timelineItem} data-kind={update.kind} data-status={update.status ?? undefined}>
                  <div className={styles.timelineHead}>
                    {update.status && <span className={cx(styles.badge, styles[`tone_${STATUS_META[update.status].tone}`])}>{STATUS_META[update.status].label}</span>}
                    <span className={styles.meta}>{`${update.author} · ${formatAgo(update.at, now)}`}</span>
                    {update.kind === 'update' && <span className={cx(styles.visibility, update.public && styles.visibilityPublic)}>{update.public ? 'Public' : 'Internal'}</span>}
                  </div>
                  <span className={cx(styles.timelineText, update.kind === 'event' && styles.eventText)}>{update.message}</span>
                </li>
              ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}