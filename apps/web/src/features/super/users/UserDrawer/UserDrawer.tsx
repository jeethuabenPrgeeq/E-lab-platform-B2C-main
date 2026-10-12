'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Ban, KeyRound, Mail, RotateCcw, Send, X } from 'lucide-react';
import type { UserStore } from '../lib/api';
import { CYCLE_META, PLAN_META, ROLE_META, STATUS_META, cx, formatAgo, formatDate, initials } from '../lib/shared';
import type { PlatformUser, UserRole } from '../lib/types';
import styles from './UserDrawer.module.css';

type Store = UserStore;

interface UserDrawerProps {
  user: PlatformUser;
  now: number;
  store: Store;
  onClose: () => void;
}

export function UserDrawer({ user, now, store, onClose }: UserDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const status = STATUS_META[user.status];
  const plan = PLAN_META[user.plan];

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
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(''), 3000);
    return () => window.clearTimeout(id);
  }, [flash]);

  const submitSuspend = async (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError('Give a reason of at least 5 characters — it is shown in the audit log');
      return;
    }
    if (!(await store.suspend([user.id], reason.trim()))) {
      setError('The account was not suspended — see the message on the page');
      return;
    }
    setSuspending(false);
    setReason('');
  };

  const facts: [string, string][] = [
    ['User ID', user.id],
    ['Institution', user.institution],
    ['Joined', formatDate(user.joinedAt)],
    ['Last active', formatAgo(user.lastActiveAt, now)],
    ['Problems solved', user.solved.toLocaleString('en-IN')],
    ['Submissions', user.submissions.toLocaleString('en-IN')],
    ['Current streak', user.streak ? `${user.streak} days` : '—'],
    ['Plan', user.status === 'trial' ? `${plan.label} (trial)` : plan.label],
    ['Billing', user.plan === 'enterprise' ? 'Institution licence' : user.cycle ? CYCLE_META[user.cycle] : plan.paid && user.status === 'trial' ? 'Not billed during trial' : '—'],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="user-title">
        <div className={styles.head}>
          <div className={styles.profile}>
            <span className={styles.bigAvatar} aria-hidden="true">
              {initials(user.name)}
            </span>
            <div className={styles.headText}>
              <h2 id="user-title" className={styles.title}>
                {user.name}
              </h2>
              <a className={styles.mail} href={`mailto:${user.email}`}>
                <Mail width={13} height={13} aria-hidden="true" />
                {user.email}
              </a>
              <div className={styles.badges}>
                <span className={cx(styles.badge, styles[`tone_${status.tone}`])}>{status.label}</span>
                <span className={cx(styles.badge, styles[`tone_${plan.tone}`])}>{plan.label}</span>
              </div>
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close user" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        {user.status === 'suspended' && user.suspendReason && (
          <div className={styles.suspendedBox}>
            <strong>Account suspended</strong>
            <span>{user.suspendReason}</span>
          </div>
        )}

        <label className={styles.field}>
          <span className={styles.label}>Role</span>
          <select className={styles.control} value={user.role} disabled title="Only learner accounts exist right now">
            {Object.entries(ROLE_META).map(([value, meta]) => (
              <option key={value} value={value as UserRole}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.actionBar}>
          {user.status === 'invited' && (
            <button
              type="button"
              className={styles.action}
              onClick={async () => {
                const failed = await store.resendInvite(user.id);
                setFlash(failed ?? `New temporary password created for ${user.email}`);
              }}
            >
              <Send width={16} height={16} aria-hidden="true" />
              Resend invite
            </button>
          )}
          {(user.status === 'active' || user.status === 'trial') && (
            <button
              type="button"
              className={styles.action}
              onClick={async () => {
                const failed = await store.resetPassword(user.id);
                setFlash(failed ?? `Password reset for ${user.email}`);
              }}
            >
              <KeyRound width={16} height={16} aria-hidden="true" />
              Reset password
            </button>
          )}
          {user.status === 'suspended' || user.status === 'deactivated' ? (
            <button type="button" className={cx(styles.action, styles.actionSuccess)} onClick={() => void store.reactivate([user.id])}>
              <RotateCcw width={16} height={16} aria-hidden="true" />
              Reactivate
            </button>
          ) : (
            <button
              type="button"
              className={cx(styles.action, styles.actionDanger)}
              onClick={() => {
                setSuspending(true);
                setError('');
              }}
            >
              <Ban width={16} height={16} aria-hidden="true" />
              Suspend
            </button>
          )}
        </div>

        {store.credentials.find((item) => item.email === user.email) && (
          <p className={styles.flash} role="status">
            {'Temporary password: '}
            <code>{store.credentials.find((item) => item.email === user.email)!.password}</code>
            {' — share it securely; it is shown only once.'}
          </p>
        )}
        {flash && (
          <p className={styles.flash} role="status">
            {flash}
          </p>
        )}

        {suspending && (
          <form className={styles.closeForm} onSubmit={submitSuspend} noValidate>
            <h3 className={styles.sectionTitle}>{`Suspend ${user.name.split(' ')[0]}`}</h3>
            <p className={styles.hint}>They are signed out everywhere and cannot sign in until reactivated. Their submissions are kept.</p>
            <label className={styles.field}>
              <span className={styles.label}>Reason</span>
              <textarea
                className={cx(styles.control, styles.textarea, error && styles.controlError)}
                value={reason}
                placeholder="e.g. Repeated plagiarism in assessments"
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              {error && <span className={styles.errorText}>{error}</span>}
            </label>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setSuspending(false)}>
                Cancel
              </button>
              <button type="submit" className={cx(styles.primaryButton, styles.dangerButton)}>
                Suspend
              </button>
            </div>
          </form>
        )}

        <dl className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Account activity</h3>
          <ol className={styles.timeline}>
            {user.activity
              .slice()
              .reverse()
              .map((item, index) => (
                <li key={`${item.at}-${index}`} className={styles.timelineItem} data-kind={item.text.startsWith('Suspended') ? 'report' : item.text.startsWith('Reactivated') ? 'status' : 'reply'}>
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
