'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarClock, Check, ChevronsRight, Pause, Play, Rocket, Undo2, X } from 'lucide-react';
import { displayStatus, rolloutPercent } from '../lib/display';
import type { useReleases } from '../lib/api';
import { CHANGE_META, STAGES, STAGE_MS, TYPE_META, cx, formatAgo, formatDateTime, formatSpan, toLocalInput } from '../lib/shared';
import type { ChangeKind, Release } from '../lib/types';
import styles from './ReleaseDrawer.module.css';

type Store = ReturnType<typeof useReleases>;

interface ReleaseDrawerProps {
  release: Release;
  now: number;
  store: Store;
  isCurrent: boolean;
  blockedBy: string | null;
  onClose: () => void;
}

const MIN_LEAD_MS = 5 * 60_000;

export function ReleaseDrawer({ release, now, store, isCurrent, blockedBy, onClose }: ReleaseDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [panel, setPanel] = useState<'schedule' | 'rollback' | null>(null);
  const [when, setWhen] = useState(() => toLocalInput(Date.now() + 24 * 3_600_000));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const status = displayStatus(release, isCurrent ? release.id : null);
  const percent = rolloutPercent(release);
  const done = release.checklist.filter((item) => item.done).length;
  const ready = done === release.checklist.length;
  const editable = release.status === 'draft' || release.status === 'scheduled';
  const nextIn = release.status === 'rolling' && release.stageAt !== null ? Math.max(0, Math.ceil((release.stageAt + STAGE_MS - now) / 1000)) : null;

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

  const openPanel = (kind: 'schedule' | 'rollback') => {
    setPanel(kind);
    setError('');
    setReason('');
  };

  const submitSchedule = (event: FormEvent) => {
    event.preventDefault();
    const at = new Date(when).getTime();
    if (!when || Number.isNaN(at)) return setError('Pick a date and time');
    if (at < Date.now() + MIN_LEAD_MS) return setError('Schedule at least 5 minutes from now');
    store.schedule(release.id, at);
    setPanel(null);
  };

  const submitRollback = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 8) return setError('Give a short reason (at least 8 characters) for the record');
    store.rollback(release.id, reason.trim());
    setPanel(null);
  };

  const grouped = (['added', 'changed', 'fixed'] as ChangeKind[])
    .map((kind) => ({ kind, items: release.changes.filter((change) => change.kind === kind) }))
    .filter((group) => group.items.length);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="release-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{`${TYPE_META[release.type]} · owned by ${release.owner}`}</span>
            <h2 id="release-title" className={styles.title}>
              <span className={styles.version}>{release.version}</span>
              {release.title}
            </h2>
            <div className={styles.badges}>
              <span className={cx(styles.badge, styles[`tone_${status.tone}`])}>{status.label}</span>
              {isCurrent && <span className={cx(styles.badge, styles.tone_success)}>In production</span>}
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close release" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <section className={styles.rolloutCard} aria-label="Rollout">
          <div className={styles.rolloutHead}>
            <strong>{release.status === 'draft' ? 'Not started' : release.status === 'scheduled' && release.scheduledAt ? `Starts ${formatDateTime(release.scheduledAt)}` : `${percent}% of institutions`}</strong>
            <span className={styles.meta}>
              {nextIn !== null
                ? percent < 100
                  ? `Next stage in ${nextIn >= 60 ? formatSpan(nextIn * 1000) : `${nextIn}s`}`
                  : ''
                : release.status === 'paused'
                  ? 'Paused — not expanding'
                  : release.status === 'rolled_back'
                    ? `Rolled back at ${percent}%`
                    : release.status === 'live' && release.completedAt
                      ? `Live since ${formatDateTime(release.completedAt)}`
                      : ''}
            </span>
          </div>
          <div className={styles.stageTrack} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Rollout progress">
            <div className={cx(styles.stageFill, styles[`fill_${release.status}`])} style={{ width: `${percent}%` }} />
            {STAGES.map((stage) => (
              <span key={stage} className={cx(styles.stageMark, percent >= stage && styles.stageMarkOn)} style={{ left: `${stage}%` }} aria-hidden="true" />
            ))}
          </div>
          <div className={styles.stageLabels} aria-hidden="true">
            {STAGES.map((stage) => (
              <span key={stage} style={{ left: `${stage}%` }}>{`${stage}%`}</span>
            ))}
          </div>
        </section>

        <div className={styles.actionBar}>
          {release.status === 'draft' && (
            <>
              <button type="button" className={styles.action} disabled={!ready} title={ready ? undefined : 'Finish the checklist first'} onClick={() => openPanel('schedule')}>
                <CalendarClock width={16} height={16} aria-hidden="true" />
                Schedule
              </button>
              <button type="button" className={cx(styles.action, styles.actionWarn)} disabled={!ready || Boolean(blockedBy)} title={!ready ? 'Finish the checklist first' : blockedBy ? `${blockedBy} is still rolling out` : undefined} onClick={() => store.start(release.id)}>
                <Rocket width={16} height={16} aria-hidden="true" />
                Start rollout now
              </button>
            </>
          )}
          {release.status === 'scheduled' && (
            <>
              <button type="button" className={cx(styles.action, styles.actionWarn)} disabled={!ready || Boolean(blockedBy)} title={blockedBy ? `${blockedBy} is still rolling out` : undefined} onClick={() => store.start(release.id)}>
                <Rocket width={16} height={16} aria-hidden="true" />
                Start now
              </button>
              <button type="button" className={styles.action} onClick={() => store.unschedule(release.id)}>
                <Undo2 width={16} height={16} aria-hidden="true" />
                Move to draft
              </button>
            </>
          )}
          {release.status === 'rolling' && (
            <>
              <button type="button" className={cx(styles.action, styles.actionDanger)} onClick={() => store.pause(release.id)}>
                <Pause width={16} height={16} aria-hidden="true" />
                Pause
              </button>
              <button type="button" className={cx(styles.action, styles.actionSuccess)} onClick={() => store.promote(release.id)}>
                <ChevronsRight width={16} height={16} aria-hidden="true" />
                Promote to 100%
              </button>
            </>
          )}
          {release.status === 'paused' && (
            <button type="button" className={cx(styles.action, styles.actionWarn)} onClick={() => store.resume(release.id)}>
              <Play width={16} height={16} aria-hidden="true" />
              Resume
            </button>
          )}
          {(release.status === 'rolling' || release.status === 'paused' || (release.status === 'live' && isCurrent)) && (
            <button type="button" className={cx(styles.action, styles.actionDanger)} onClick={() => openPanel('rollback')}>
              <Undo2 width={16} height={16} aria-hidden="true" />
              Roll back
            </button>
          )}
        </div>
        {blockedBy && editable && ready && <p className={styles.hint}>{`Only one release can roll out at a time — ${blockedBy} is in progress.`}</p>}

        {panel === 'schedule' && (
          <form className={styles.closeForm} onSubmit={submitSchedule} noValidate>
            <h3 className={styles.sectionTitle}>Schedule rollout</h3>
            <label className={styles.field}>
              <span className={styles.label}>Start at</span>
              <input
                type="datetime-local"
                className={cx(styles.control, error && styles.controlError)}
                value={when}
                min={toLocalInput(Date.now() + MIN_LEAD_MS)}
                onChange={(event) => {
                  setWhen(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              <span className={error ? styles.errorText : styles.hint}>{error || `Rolls out in stages: ${STAGES.join('% → ')}%`}</span>
            </label>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setPanel(null)}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryButton}>
                Schedule
              </button>
            </div>
          </form>
        )}

        {panel === 'rollback' && (
          <form className={styles.closeForm} onSubmit={submitRollback} noValidate>
            <h3 className={styles.sectionTitle}>{`Roll back ${release.version}`}</h3>
            <p className={styles.warnText}>
              {release.status === 'live' ? 'Every institution moves back to the previous production version.' : `The ${percent}% of institutions on this release move back to the current production version.`}
            </p>
            <label className={styles.field}>
              <span className={styles.label}>Reason</span>
              <textarea
                className={cx(styles.control, styles.textarea, error && styles.controlError)}
                value={reason}
                placeholder="e.g. Sandbox error rate rose after the new image"
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              {error && <span className={styles.errorText}>{error}</span>}
            </label>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setPanel(null)}>
                Cancel
              </button>
              <button type="submit" className={cx(styles.primaryButton, styles.dangerButton)}>
                Roll back
              </button>
            </div>
          </form>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Release checklist</h3>
            <span className={cx(styles.meta, ready && styles.readyText)}>{`${done} of ${release.checklist.length} done`}</span>
          </div>
          <ul className={styles.checklist}>
            {release.checklist.map((item) => (
              <li key={item.id}>
                <label className={cx(styles.checkItem, !editable && styles.checkLocked)}>
                  <input type="checkbox" checked={item.done} disabled={!editable} onChange={() => store.toggleCheck(release.id, item.id)} />
                  <span className={cx(styles.checkBox, item.done && styles.checkBoxOn)} aria-hidden="true">
                    {item.done && <Check width={12} height={12} />}
                  </span>
                  {item.label}
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Changelog</h3>
          <div className={styles.changelog}>
            {grouped.map((group) => (
              <div key={group.kind}>
                <span className={cx(styles.badge, styles[`tone_${CHANGE_META[group.kind].tone}`])}>{CHANGE_META[group.kind].label}</span>
                <ul className={styles.changeList}>
                  {group.items.map((change) => (
                    <li key={change.text}>{change.text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Timeline</h3>
          <ol className={styles.timeline}>
            {release.events
              .slice()
              .reverse()
              .map((item) => (
                <li key={item.id} className={styles.timelineItem} data-tone={item.tone}>
                  <span className={styles.timelineText}>
                    <strong>{item.actor}</strong> {item.text}
                  </span>
                  <span className={styles.meta}>{formatAgo(item.at, now)}</span>
                </li>
              ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}