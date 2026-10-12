'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Ban, LogOut, Mail, RotateCcw, Send, ShieldOff, X } from 'lucide-react';
import type { AdminStore } from '../lib/api';
import { ALL_SCOPE, PERMISSION_LABEL, SCOPES, STATUS_META, SUPER_ROLE, cx, formatAgo, formatDate, initials, isActiveSuper, roleName, roleTone } from '../lib/shared';
import type { AdminAccount } from '../lib/types';
import styles from './AdminDrawer.module.css';

interface AdminDrawerProps {
  admin: AdminAccount;
  now: number;
  store: AdminStore;
  onClose: () => void;
}

export function AdminDrawer({ admin, now, store, onClose }: AdminDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [revoking, setRevoking] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState('');
  const [flash, setFlash] = useState('');

  const status = STATUS_META[admin.status];
  const role = store.roles.find((item) => item.id === admin.roleId);
  const lastSuper = isActiveSuper(admin) && store.admins.filter(isActiveSuper).length <= 1;
  const roleLocked = admin.self || lastSuper || admin.status === 'revoked';
  const roleLockReason = admin.self ? 'You cannot change your own role' : lastSuper ? 'Last active super admin — promote someone else first' : admin.status === 'revoked' ? 'Restore access to change the role' : '';

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

  const submitRevoke = async (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError('Give a reason of at least 5 characters — it is shown in the audit log');
      return;
    }
    const result = await store.revoke(admin.id, reason.trim());
    if (result) {
      setError(result);
      return;
    }
    setRevoking(false);
    setReason('');
  };

  const facts: [string, string][] = [
    ['Admin ID', admin.id],
    ['Scope', admin.scope],
    ['Invited', formatDate(admin.createdAt)],
    ['Invited by', admin.invitedBy],
    ['Last sign-in', admin.status === 'invited' ? 'Not joined yet' : formatAgo(admin.lastSignInAt, now)],
    ['Two-factor', admin.status === 'invited' ? 'Set up at first sign-in' : admin.mfa ? 'On' : 'Off'],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="admin-title">
        <div className={styles.head}>
          <div className={styles.profile}>
            <span className={styles.bigAvatar} aria-hidden="true">
              {initials(admin.name)}
            </span>
            <div className={styles.headText}>
              <h2 id="admin-title" className={styles.title}>
                {admin.self ? `${admin.name} (you)` : admin.name}
              </h2>
              <a className={styles.mail} href={`mailto:${admin.email}`}>
                <Mail width={13} height={13} aria-hidden="true" />
                {admin.email}
              </a>
              <div className={styles.badges}>
                <span className={cx(styles.badge, styles[`tone_${status.tone}`])}>{status.label}</span>
                <span className={cx(styles.badge, styles[`tone_${roleTone(admin.roleId)}`])}>{roleName(store.roles, admin.roleId)}</span>
              </div>
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close admin" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        {admin.status === 'revoked' && admin.revokeReason && (
          <div className={styles.suspendedBox}>
            <strong>Access revoked</strong>
            <span>{admin.revokeReason}</span>
          </div>
        )}

        <div className={styles.twoFields}>
          <label className={styles.field}>
            <span className={styles.label}>Role</span>
            <select
              className={styles.control}
              value={admin.roleId}
              disabled={roleLocked}
              onChange={async (event) => {
                const result = await store.setRole(admin.id, event.target.value);
                setBlocked(result ?? '');
              }}
            >
              {store.roles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Scope</span>
            <select className={styles.control} value={admin.scope} disabled={admin.roleId === SUPER_ROLE || admin.status === 'revoked'} onChange={async (event) => setBlocked((await store.setScope(admin.id, event.target.value)) ?? '')}>
              {SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {scope}
                </option>
              ))}
            </select>
          </label>
        </div>
        {(roleLockReason || blocked) && <p className={styles.hint}>{blocked || roleLockReason}</p>}
        {admin.roleId === SUPER_ROLE && !roleLockReason && <p className={styles.hint}>Super admins always have access to {ALL_SCOPE.toLowerCase()}</p>}

        <div className={styles.actionBar}>
          {admin.status === 'invited' && (
            <button
              type="button"
              className={styles.action}
              onClick={async () => {
                const failed = await store.resendInvite(admin.id);
                if (failed) setBlocked(failed);
                else setFlash(`New temporary password created for ${admin.email}`);
              }}
            >
              <Send width={16} height={16} aria-hidden="true" />
              Resend invite
            </button>
          )}
          {admin.status === 'active' && admin.mfa && !admin.self && (
            <button
              type="button"
              className={styles.action}
              onClick={async () => {
                const failed = await store.resetMfa(admin.id);
                if (failed) setBlocked(failed);
                else setFlash('Two-factor reset — they must set it up at next sign-in');
              }}
            >
              <ShieldOff width={16} height={16} aria-hidden="true" />
              Reset two-factor
            </button>
          )}
          {admin.status === 'active' && !admin.self && (
            <button
              type="button"
              className={styles.action}
              onClick={async () => {
                const failed = await store.signOutEverywhere(admin.id);
                if (failed) setBlocked(failed);
                else setFlash('Signed out of all sessions');
              }}
            >
              <LogOut width={16} height={16} aria-hidden="true" />
              Sign out everywhere
            </button>
          )}
          {admin.status === 'revoked' ? (
            <button type="button" className={cx(styles.action, styles.actionSuccess)} onClick={async () => setBlocked((await store.restore(admin.id)) ?? '')}>
              <RotateCcw width={16} height={16} aria-hidden="true" />
              Restore access
            </button>
          ) : (
            !admin.self && (
              <button
                type="button"
                className={cx(styles.action, styles.actionDanger)}
                disabled={lastSuper}
                title={lastSuper ? 'eLab must always have at least one active super admin' : undefined}
                onClick={() => {
                  setRevoking(true);
                  setError('');
                }}
              >
                <Ban width={16} height={16} aria-hidden="true" />
                Revoke access
              </button>
            )
          )}
        </div>

        {store.credential?.email === admin.email && (
          <p className={styles.flash} role="status">
            {'Temporary password: '}
            <code>{store.credential.password}</code>
            {' — share it securely; it is shown only once.'}
          </p>
        )}
        {flash && (
          <p className={styles.flash} role="status">
            {flash}
          </p>
        )}

        {revoking && (
          <form className={styles.closeForm} onSubmit={submitRevoke} noValidate>
            <h3 className={styles.sectionTitle}>{`Revoke ${admin.name.split(' ')[0]}’s access`}</h3>
            <p className={styles.hint}>They are signed out at once and lose access to the admin console. Their history stays in the audit log.</p>
            <label className={styles.field}>
              <span className={styles.label}>Reason</span>
              <textarea
                className={cx(styles.control, styles.textarea, error && styles.controlError)}
                value={reason}
                placeholder="e.g. Moved to another team"
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              {error && <span className={styles.errorText}>{error}</span>}
            </label>
            <div className={styles.formActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setRevoking(false)}>
                Cancel
              </button>
              <button type="submit" className={cx(styles.primaryButton, styles.dangerButton)}>
                Revoke access
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

        {role && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{`What a ${role.name.toLowerCase()} can do`}</h3>
            {role.locked ? (
              <p className={styles.hint}>Every permission in eLab, including managing other admins.</p>
            ) : role.permissions.length === 0 ? (
              <p className={styles.hint}>Nothing yet — give this role permissions under Roles &amp; permissions.</p>
            ) : (
              <ul className={styles.permList}>
                {role.permissions.map((key) => (
                  <li key={key}>{PERMISSION_LABEL[key]}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Activity</h3>
          <ol className={styles.timeline}>
            {admin.activity
              .slice()
              .reverse()
              .map((item, index) => (
                <li key={`${item.at}-${index}`} className={styles.timelineItem} data-kind={item.text.startsWith('Revoked') ? 'report' : item.text.startsWith('Restored') || item.text.startsWith('Accepted') ? 'status' : 'reply'}>
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