'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, MessageSquare, Play, RotateCcw, Send, StickyNote, UserMinus, UserPlus, X, XCircle } from 'lucide-react';
import type { useProblemReports } from '../lib/api';
import { CATEGORY_META, ME, PRIORITY_META, RESOLUTION_META, STATUS_META, cx, formatAgo, formatDateTime, priorityOf } from '../lib/shared';
import type { ProblemReport, ResolutionType } from '../lib/types';
import styles from './ReportDrawer.module.css';

type Store = ReturnType<typeof useProblemReports>;

interface ReportDrawerProps {
  report: ProblemReport;
  now: number;
  store: Store;
  onClose: () => void;
}

const REPLY_MIN = 10;

export function ReportDrawer({ report, now, store, onClose }: ReportDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [closing, setClosing] = useState<'resolved' | 'rejected' | null>(null);
  const [resolutionType, setResolutionType] = useState<ResolutionType>('fixed_testcase');
  const [resolutionNote, setResolutionNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState('');

  const active = report.status === 'open' || report.status === 'in_review';
  const priority = PRIORITY_META[priorityOf(report)];
  const status = STATUS_META[report.status];
  const learners = new Set(report.reports.map((item) => item.learner)).size;
  const technical = CATEGORY_META[report.category].technical;

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

  const beginClose = (kind: 'resolved' | 'rejected') => {
    setClosing(kind);
    setResolutionType(kind === 'resolved' ? (technical ? (report.category === 'compiler' ? 'fixed_runtime' : 'fixed_testcase') : 'updated_statement') : 'not_a_bug');
    setResolutionNote('');
    setNoteError('');
  };

  const submitClose = (event: FormEvent) => {
    event.preventDefault();
    if (!closing) return;
    const text = resolutionNote.trim();
    if (text.length < REPLY_MIN) {
      setNoteError(`Write at least ${REPLY_MIN} characters so learners know what changed`);
      return;
    }
    store.close(report.id, closing, resolutionType, text);
    setClosing(null);
  };

  const submitMessage = (event: FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (text.length < 2) {
      setMessageError(mode === 'reply' ? 'Write a reply first' : 'Write a note first');
      return;
    }
    if (mode === 'reply') store.reply(report.id, text);
    else store.note(report.id, `Internal note: ${text}`);
    setMessage('');
    setMessageError('');
  };

  const facts: [string, string][] = [
    ['Problem', report.problem],
    ['Category', CATEGORY_META[report.category].label],
    ['Reported by', `${learners} learner${learners === 1 ? '' : 's'}`],
    ['First reported', formatDateTime(report.createdAt)],
    ['Assignee', report.assignee ?? 'Unassigned'],
    ['Difficulty', report.difficulty[0].toUpperCase() + report.difficulty.slice(1)],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{report.id}</span>
            <h2 id="report-title" className={styles.title}>
              {report.title}
            </h2>
            <div className={styles.badges}>
              <span className={cx(styles.badge, styles[`tone_${status.tone}`])}>{status.label}</span>
              <span className={cx(styles.badge, styles[`tone_${priority.tone}`])}>{`${priority.label} priority`}</span>
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close report" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.actionBar}>
          {active && report.assignee !== ME && (
            <button type="button" className={styles.action} onClick={() => store.assign(report.id, ME)}>
              <UserPlus width={16} height={16} aria-hidden="true" />
              Assign to me
            </button>
          )}
          {active && report.assignee && (
            <button type="button" className={styles.action} onClick={() => store.assign(report.id, null)}>
              <UserMinus width={16} height={16} aria-hidden="true" />
              Unassign
            </button>
          )}
          {report.status === 'open' && (
            <button type="button" className={styles.action} onClick={() => store.startReview(report.id)}>
              <Play width={16} height={16} aria-hidden="true" />
              Start review
            </button>
          )}
          {active && (
            <>
              <button type="button" className={cx(styles.action, styles.actionSuccess)} onClick={() => beginClose('resolved')}>
                <CheckCircle2 width={16} height={16} aria-hidden="true" />
                Resolve
              </button>
              <button type="button" className={cx(styles.action, styles.actionDanger)} onClick={() => beginClose('rejected')}>
                <XCircle width={16} height={16} aria-hidden="true" />
                Reject
              </button>
            </>
          )}
          {!active && (
            <button type="button" className={styles.action} onClick={() => store.reopen(report.id)}>
              <RotateCcw width={16} height={16} aria-hidden="true" />
              Reopen
            </button>
          )}
        </div>

        {closing && (
          <form className={styles.closeForm} onSubmit={submitClose} noValidate>
            <h3 className={styles.sectionTitle}>{closing === 'resolved' ? 'Resolve report' : 'Reject report'}</h3>
            <label className={styles.field}>
              <span className={styles.label}>Outcome</span>
              <select className={styles.control} value={resolutionType} onChange={(event) => setResolutionType(event.target.value as ResolutionType)}>
                {Object.entries(RESOLUTION_META)
                  .filter(([, meta]) => meta.for === (closing === 'resolved' ? 'resolve' : 'reject'))
                  .map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Message to learners</span>
              <textarea
                className={cx(styles.control, styles.textarea, noteError && styles.controlError)}
                value={resolutionNote}
                placeholder={closing === 'resolved' ? 'e.g. Fixed hidden test 15 and rejudged affected submissions.' : 'e.g. The statement asks for characters, not words.'}
                onChange={(event) => {
                  setResolutionNote(event.target.value);
                  if (noteError) setNoteError('');
                }}
                aria-invalid={noteError ? true : undefined}
                aria-describedby="close-note-msg"
              />
              <span id="close-note-msg" className={noteError ? styles.errorText : styles.hint}>
                {noteError || `Sent to all ${learners} reporter${learners === 1 ? '' : 's'}`}
              </span>
            </label>
            {closing === 'resolved' && resolutionType === 'fixed_testcase' && (
              <p className={styles.hint}>
                {'Remember to rejudge the affected submissions in '}
                <Link href="/submissions/rejudge" className={styles.inlineLink}>
                  Submission Monitoring
                </Link>
                .
              </p>
            )}
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setClosing(null)}>
                Cancel
              </button>
              <button type="submit" className={cx(styles.primaryButton, closing === 'rejected' && styles.dangerButton)}>
                {closing === 'resolved' ? 'Resolve' : 'Reject'}
              </button>
            </div>
          </form>
        )}

        {report.resolution && (
          <div className={cx(styles.resolution, report.status === 'rejected' && styles.resolutionRejected)}>
            <strong>{RESOLUTION_META[report.resolution.type].label}</strong>
            <span>{report.resolution.note}</span>
            <span className={styles.meta}>{formatDateTime(report.resolution.at)}</span>
          </div>
        )}

        <dl className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {technical && (
          <div className={styles.links}>
            <Link href="/test-cases" className={styles.linkButton}>
              <ExternalLink width={14} height={14} aria-hidden="true" />
              Open test cases
            </Link>
            <Link href="/submissions/list" className={styles.linkButton}>
              <ExternalLink width={14} height={14} aria-hidden="true" />
              View submissions
            </Link>
          </div>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{`Learner reports (${report.reports.length})`}</h3>
          <ul className={styles.reports}>
            {report.reports
              .slice()
              .reverse()
              .map((item, index) => (
                <li key={`${item.learner}-${index}`} className={styles.reportItem}>
                  <div className={styles.reportHead}>
                    <span className={styles.mono}>{item.learner}</span>
                    <span className={styles.meta}>{`${item.language}${item.submissionId ? ` · ${item.submissionId}` : ''} · ${formatAgo(item.at, now)}`}</span>
                  </div>
                  <p className={styles.reportText}>{item.message}</p>
                </li>
              ))}
          </ul>
        </section>

        <section className={styles.section}>
          <div className={styles.composerTabs} role="tablist" aria-label="Message type">
            <button type="button" role="tab" aria-selected={mode === 'reply'} className={cx(styles.composerTab, mode === 'reply' && styles.composerTabActive)} onClick={() => setMode('reply')}>
              <MessageSquare width={15} height={15} aria-hidden="true" />
              Reply to learners
            </button>
            <button type="button" role="tab" aria-selected={mode === 'note'} className={cx(styles.composerTab, mode === 'note' && styles.composerTabActive)} onClick={() => setMode('note')}>
              <StickyNote width={15} height={15} aria-hidden="true" />
              Internal note
            </button>
          </div>
          <form className={styles.composer} onSubmit={submitMessage} noValidate>
            <textarea
              className={cx(styles.control, styles.textarea, messageError && styles.controlError)}
              value={message}
              placeholder={mode === 'reply' ? `Message all ${learners} reporter${learners === 1 ? '' : 's'}…` : 'Only admins can see internal notes…'}
              onChange={(event) => {
                setMessage(event.target.value);
                if (messageError) setMessageError('');
              }}
              aria-label={mode === 'reply' ? 'Reply to learners' : 'Internal note'}
              aria-invalid={messageError ? true : undefined}
            />
            <div className={styles.composerFoot}>
              <span className={messageError ? styles.errorText : styles.hint}>{messageError || (mode === 'reply' ? 'Learners get this as a notification' : 'Not visible to learners')}</span>
              <button type="submit" className={styles.primaryButton}>
                <Send width={15} height={15} aria-hidden="true" />
                {mode === 'reply' ? 'Send reply' : 'Add note'}
              </button>
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Activity</h3>
          <ol className={styles.timeline}>
            {report.activity
              .slice()
              .reverse()
              .map((item, index) => (
                <li key={`${item.at}-${index}`} className={styles.timelineItem} data-kind={item.kind}>
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