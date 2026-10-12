'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Ban, Clock, Copy, Pencil, Square, Trash2, Undo2, X } from 'lucide-react';
import type { ContentItem } from '../../content/lib/types';
import type { ChallengeStore } from '../lib/api';
import { ACCESS_META, DIFFICULTY_META, KIND_META, STATUS_META, cx, formatAgo, formatCount, formatDuration, formatRelative, formatRupees, formatWhen, statusOf } from '../lib/shared';
import type { Challenge } from '../lib/types';
import styles from './ChallengeDrawer.module.css';

interface ChallengeDrawerProps {
  challenge: Challenge;
  now: number;
  catalog: ContentItem[];
  store: ChallengeStore;
  onEdit: () => void;
  onNotice: (text: string) => void;
  onOpen: (id: string) => void;
  onClose: () => void;
}

export function ChallengeDrawer({ challenge, now, catalog, store, onEdit, onNotice, onOpen, onClose }: ChallengeDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [cancelling, setCancelling] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const status = statusOf(challenge, now);
  const st = STATUS_META[status];
  const catalogMap = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);
  const duration = Math.round((challenge.endAt - challenge.startAt) / 60000);
  const long = duration >= 1440;

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

  const submitCancel = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError('Give a reason of at least 5 characters — registered learners are emailed this');
      return;
    }
    store.cancel(challenge.id, reason.trim());
    onNotice(`Cancelled ${challenge.title} and notified ${formatCount(challenge.registered)} registered learners`);
    setCancelling(false);
  };

  const duplicate = async () => {
    const id = await store.duplicate(challenge.id);
    if (id) {
      onNotice(`Created a draft copy of ${challenge.title}`);
      onOpen(id);
    }
  };

  const timing: [string, string][] = [
    ['Starts', formatWhen(challenge.startAt)],
    ['Ends', formatWhen(challenge.endAt)],
    ['Duration', formatDuration(duration)],
    [status === 'live' ? 'Time left' : status === 'ended' ? 'Finished' : 'Countdown', status === 'live' ? formatRelative(challenge.endAt, now).replace(/^in /, '') : status === 'cancelled' ? '—' : formatRelative(status === 'ended' ? challenge.endAt : challenge.startAt, now)],
    ['Registered', challenge.registered ? formatCount(challenge.registered) : '—'],
    ['Took part', challenge.participants ? `${formatCount(challenge.participants)} (${Math.round((challenge.participants / Math.max(1, challenge.registered)) * 100)}%)` : '—'],
    ['Prize', challenge.prize ? formatRupees(challenge.prize) : challenge.kind === 'hiring' ? 'Interview shortlist' : 'None'],
    ['Who can join', ACCESS_META[challenge.access]],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="challenge-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{`${challenge.id} · ${KIND_META[challenge.kind].label}${challenge.sponsor ? ` · ${challenge.sponsor}` : ''}`}</span>
            <h2 id="challenge-title" className={styles.title}>
              {challenge.title}
            </h2>
            <div className={styles.badges}>
              <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
              <span className={cx(styles.badge, styles.tone_neutral)}>{`${challenge.problems.length} problem${challenge.problems.length === 1 ? '' : 's'}`}</span>
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close challenge" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        {status === 'cancelled' && challenge.cancelReason && (
          <div className={styles.suspendedBox}>
            <strong>Cancelled</strong>
            <span>{challenge.cancelReason}</span>
          </div>
        )}

        <div className={styles.actionBar}>
          {(status === 'draft' || status === 'scheduled') && (
            <button type="button" className={styles.action} onClick={onEdit}>
              <Pencil width={16} height={16} aria-hidden="true" />
              {status === 'draft' ? 'Edit and schedule' : 'Edit'}
            </button>
          )}
          {status === 'scheduled' && (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                store.unpublish(challenge.id);
                onNotice(`${challenge.title} moved back to drafts`);
              }}
            >
              <Undo2 width={16} height={16} aria-hidden="true" />
              Move to draft
            </button>
          )}
          {status === 'live' && (
            <>
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  store.extend(challenge.id, long ? 1440 : 30);
                  onNotice(`Extended ${challenge.title} by ${long ? '1 day' : '30 minutes'}`);
                }}
              >
                <Clock width={16} height={16} aria-hidden="true" />
                {long ? 'Extend 1 day' : 'Extend 30 min'}
              </button>
              <button type="button" className={cx(styles.action, styles.actionDanger)} onClick={() => setConfirmEnd(true)}>
                <Square width={16} height={16} aria-hidden="true" />
                End now
              </button>
            </>
          )}
          {status === 'scheduled' && (
            <button
              type="button"
              className={cx(styles.action, styles.actionDanger)}
              onClick={() => {
                setCancelling(true);
                setError('');
              }}
            >
              <Ban width={16} height={16} aria-hidden="true" />
              Cancel
            </button>
          )}
          {status === 'draft' && (
            <button
              type="button"
              className={cx(styles.action, styles.actionDanger)}
              onClick={() => {
                store.remove(challenge.id);
                onNotice(`Deleted the draft ${challenge.title}`);
                onClose();
              }}
            >
              <Trash2 width={16} height={16} aria-hidden="true" />
              Delete draft
            </button>
          )}
          <button type="button" className={styles.action} onClick={duplicate}>
            <Copy width={16} height={16} aria-hidden="true" />
            Duplicate
          </button>
        </div>

        {confirmEnd && (
          <div className={styles.closeForm} role="alert">
            <h3 className={styles.sectionTitle}>End this challenge now?</h3>
            <p className={styles.hint}>{`${formatCount(challenge.participants)} learners are still taking part. Submissions close immediately and the leaderboard is frozen.`}</p>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setConfirmEnd(false)}>
                Keep running
              </button>
              <button
                type="button"
                className={cx(styles.primaryButton, styles.dangerButton)}
                onClick={() => {
                  store.endNow(challenge.id);
                  onNotice(`Ended ${challenge.title}`);
                  setConfirmEnd(false);
                }}
              >
                End now
              </button>
            </div>
          </div>
        )}

        {cancelling && (
          <form className={styles.closeForm} onSubmit={submitCancel} noValidate>
            <h3 className={styles.sectionTitle}>Cancel this challenge</h3>
            <p className={styles.hint}>{`Registrations close and ${formatCount(challenge.registered)} registered learners get an email with your reason.`}</p>
            <label className={styles.field}>
              <span className={styles.label}>Reason</span>
              <textarea
                className={cx(styles.control, styles.textarea, error && styles.controlError)}
                value={reason}
                placeholder="e.g. Clashes with university exams"
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              {error && <span className={styles.errorText}>{error}</span>}
            </label>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setCancelling(false)}>
                Keep it
              </button>
              <button type="submit" className={cx(styles.primaryButton, styles.dangerButton)}>
                Cancel challenge
              </button>
            </div>
          </form>
        )}

        <dl className={styles.facts}>
          {timing.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Problems</h3>
          {challenge.problems.length === 0 ? (
            <p className={styles.hint}>No problems yet — add them before scheduling.</p>
          ) : (
            <ol className={styles.problemList}>
              {challenge.problems.map((id, index) => {
                const item = catalogMap.get(id);
                return (
                  <li key={id} className={styles.problemItem}>
                    <span className={styles.problemIndex}>{String.fromCharCode(65 + index)}</span>
                    <span className={styles.problemBody}>
                      <span className={styles.problemTitle}>{item?.title ?? `Missing item ${id}`}</span>
                      {item && <span className={styles.meta}>{`${item.technology} · ${DIFFICULTY_META[item.difficulty].label}${item.visibility === 'retired' ? ' · retired' : ''}`}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {challenge.leaderboard.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{status === 'live' ? 'Leaderboard right now' : 'Final leaderboard'}</h3>
            <div className={styles.boardWrap}>
              <table className={styles.board}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Learner</th>
                    <th>Solved</th>
                    <th>Score</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {challenge.leaderboard.map((entry, index) => (
                    <tr key={entry.name}>
                      <td className={styles.rank}>{index + 1}</td>
                      <td>
                        <span className={styles.problemTitle}>{entry.name}</span>
                        <span className={styles.meta}>{entry.institution}</span>
                      </td>
                      <td>{`${entry.solved}/${challenge.problems.length}`}</td>
                      <td>{entry.score}</td>
                      <td>{formatDuration(entry.minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Activity</h3>
          <ol className={styles.timeline}>
            {challenge.activity
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.at}-${index}`} className={styles.timelineItem} data-kind={/^(Cancelled|Ended)/.test(entry.text) ? 'report' : entry.text.startsWith('Scheduled') ? 'status' : 'reply'}>
                  <span className={styles.timelineText}>
                    <strong>{entry.actor}</strong> {entry.text}
                  </span>
                  <span className={styles.meta}>{formatAgo(entry.at, now)}</span>
                </li>
              ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
