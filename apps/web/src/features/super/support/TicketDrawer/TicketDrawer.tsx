'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Mail, MessageSquare, Send, StickyNote, UserPlus, X } from 'lucide-react';
import type { useTickets } from '../lib/api';
import { CANNED, CATEGORY_META, ME, PRIORITY_META, STATUS_META, cx, formatAgo, formatDateTime, initials, slaOf } from '../lib/shared';
import type { Ticket, TicketPriority, TicketStatus } from '../lib/types';
import styles from './TicketDrawer.module.css';

type Store = ReturnType<typeof useTickets>;

interface TicketDrawerProps {
  ticket: Ticket;
  now: number;
  store: Store;
  onClose: () => void;
}

export function TicketDrawer({ ticket, now, store, onClose }: TicketDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const threadEnd = useRef<HTMLLIElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const [message, setMessage] = useState('');
  const [after, setAfter] = useState<'open' | 'pending' | 'resolved'>('open');
  const [error, setError] = useState('');

  const status = STATUS_META[ticket.status];
  const priority = PRIORITY_META[ticket.priority];
  const sla = slaOf(ticket, now);

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
    threadEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [ticket.messages.length]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (text.length < 2) {
      setError(mode === 'reply' ? 'Write a reply first' : 'Write a note first');
      return;
    }
    if (mode === 'reply') store.reply(ticket.id, text, after);
    else store.addNote(ticket.id, text);
    setMessage('');
    setError('');
    setAfter('open');
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="ticket-title">
        <div className={styles.head}>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>{`${ticket.id} · ${CATEGORY_META[ticket.category]}`}</span>
            <h2 id="ticket-title" className={styles.title}>
              {ticket.subject}
            </h2>
            <div className={styles.badges}>
              <span className={cx(styles.badge, styles[`tone_${status.tone}`])}>{status.label}</span>
              <span className={cx(styles.badge, styles[`tone_${priority.tone}`])}>{priority.label}</span>
              {sla.label !== '—' && <span className={cx(styles.slaText, styles[`sla_${sla.tone}`])}>{sla.label}</span>}
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close ticket" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.controls}>
          <label className={styles.field}>
            <span className={styles.label}>Status</span>
            <select className={styles.control} value={ticket.status} onChange={(event) => store.setStatus(ticket.id, event.target.value as TicketStatus)}>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <option key={value} value={value} disabled={value === 'new' && ticket.status !== 'new'}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Priority</span>
            <select className={styles.control} value={ticket.priority} onChange={(event) => store.setPriority(ticket.id, event.target.value as TicketPriority)}>
              {Object.entries(PRIORITY_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {`${meta.label} (${meta.slaMin >= 60 ? `${meta.slaMin / 60}h` : `${meta.slaMin}m`})`}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Assignee</span>
            <select className={styles.control} value={ticket.assignee ?? ''} onChange={(event) => store.assign(ticket.id, event.target.value || null)}>
              <option value="">Unassigned</option>
              {store.agents.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
          </label>
        </div>

        {ticket.assignee !== ME && ticket.status !== 'resolved' && (
          <button type="button" className={styles.action} onClick={() => store.assign(ticket.id, ME)}>
            <UserPlus width={16} height={16} aria-hidden="true" />
            Assign to me
          </button>
        )}

        <div className={styles.requester}>
          <span className={styles.bigAvatar} aria-hidden="true">
            {initials(ticket.requester.name)}
          </span>
          <div className={styles.requesterText}>
            <strong>{ticket.requester.name}</strong>
            <span className={styles.meta}>{`${ticket.requester.role} · ${ticket.requester.org}`}</span>
            <a className={styles.mail} href={`mailto:${ticket.requester.email}`}>
              <Mail width={13} height={13} aria-hidden="true" />
              {ticket.requester.email}
            </a>
          </div>
          <div className={styles.requesterMeta}>
            <span className={styles.meta}>Opened</span>
            <span>{formatDateTime(ticket.createdAt)}</span>
            {ticket.rating !== null && <span className={styles.rating}>{`${'★'.repeat(ticket.rating)}${'☆'.repeat(5 - ticket.rating)}`}</span>}
          </div>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Conversation</h3>
          <ol className={styles.thread}>
            {ticket.messages.map((item) =>
              item.kind === 'event' ? (
                <li key={item.id} className={styles.event}>
                  {`${item.author} · ${item.body} · ${formatAgo(item.at, now)}`}
                </li>
              ) : (
                <li key={item.id} className={cx(styles.bubbleRow, item.kind !== 'requester' && styles.bubbleRowAgent)}>
                  <div className={cx(styles.bubble, styles[`bubble_${item.kind}`])}>
                    <div className={styles.bubbleHead}>
                      <strong>{item.kind === 'note' ? `${item.author} · Internal note` : item.author}</strong>
                      <span className={styles.meta}>{formatAgo(item.at, now)}</span>
                    </div>
                    <p className={styles.bubbleText}>{item.body}</p>
                  </div>
                </li>
              ),
            )}
            <li ref={threadEnd} aria-hidden="true" />
          </ol>
        </section>

        <section className={styles.section}>
          <div className={styles.composerTop}>
            <div className={styles.composerTabs} role="tablist" aria-label="Message type">
              <button type="button" role="tab" aria-selected={mode === 'reply'} className={cx(styles.composerTab, mode === 'reply' && styles.composerTabActive)} onClick={() => setMode('reply')}>
                <MessageSquare width={15} height={15} aria-hidden="true" />
                Reply
              </button>
              <button type="button" role="tab" aria-selected={mode === 'note'} className={cx(styles.composerTab, mode === 'note' && styles.composerTabActive)} onClick={() => setMode('note')}>
                <StickyNote width={15} height={15} aria-hidden="true" />
                Internal note
              </button>
            </div>
            {mode === 'reply' && (
              <select
                className={cx(styles.control, styles.cannedSelect)}
                value=""
                onChange={(event) => {
                  const canned = CANNED.find((item) => item.label === event.target.value);
                  if (canned) setMessage((current) => (current.trim() ? `${current.trim()}\n\n${canned.body}` : canned.body));
                  setError('');
                }}
                aria-label="Insert a canned reply"
              >
                <option value="">Insert canned reply…</option>
                {CANNED.map((item) => (
                  <option key={item.label} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <form className={styles.composer} onSubmit={submit} noValidate>
            <textarea
              className={cx(styles.control, styles.textarea, error && styles.controlError, mode === 'note' && styles.noteArea)}
              value={message}
              placeholder={mode === 'reply' ? `Reply to ${ticket.requester.name.split(' ')[0]}…` : 'Only the support team can see internal notes…'}
              onChange={(event) => {
                setMessage(event.target.value);
                if (error) setError('');
              }}
              aria-label={mode === 'reply' ? 'Reply' : 'Internal note'}
              aria-invalid={error ? true : undefined}
            />
            <div className={styles.composerFoot}>
              {mode === 'reply' ? (
                <label className={styles.afterField}>
                  <span className={styles.meta}>After sending</span>
                  <select className={cx(styles.control, styles.afterSelect)} value={after} onChange={(event) => setAfter(event.target.value as typeof after)}>
                    <option value="open">{ticket.status === 'resolved' ? 'Reopen ticket' : 'Keep open'}</option>
                    <option value="pending">Set pending</option>
                    <option value="resolved">Resolve</option>
                  </select>
                </label>
              ) : (
                <span className={error ? styles.errorText : styles.hint}>{error || 'Not visible to the requester'}</span>
              )}
              <button type="submit" className={styles.primaryButton}>
                <Send width={15} height={15} aria-hidden="true" />
                {mode === 'reply' ? 'Send reply' : 'Add note'}
              </button>
            </div>
            {mode === 'reply' && error && <span className={styles.errorText}>{error}</span>}
          </form>
        </section>
      </aside>
    </div>
  );
}
