'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Building2, Link2, RotateCcw, Send, X } from 'lucide-react';
import styles from '../../access/AdminDrawer/AdminDrawer.module.css';
import own from './InstitutionDrawer.module.css';
import { INSTITUTION_PERMISSION_ITEMS } from '../../access/lib/shared';
import type { InstitutionPermissionKey } from '../../access/lib/types';
import { EMAIL_PATTERN, cx, formatAgo, formatDate } from '../../users/lib/shared';
import { institutionApi } from '../lib/api';
import { ADMIN_STATUS_META, HIERARCHY_OPTIONS, INSTITUTION_STATUS_META, INSTITUTION_TYPES, TYPE_LABEL } from '../lib/shared';
import type { InstituteAdmin, InstitutionDetail, InstitutionStatus, InstitutionType, LearnerRef, StaffLevels } from '../lib/types';

interface InstitutionDrawerProps {
  institutionId: string;
  onClose: () => void;
  onChanged: () => void;
}

const sameKeys = (a: string[], b: string[]) => a.length === b.length && a.every((key) => b.includes(key));

export function InstitutionDrawer({ institutionId, onClose, onChanged }: InstitutionDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [detail, setDetail] = useState<InstitutionDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);

  const [name, setName] = useState('');
  const [type, setType] = useState<InstitutionType>('university');
  const [contactEmail, setContactEmail] = useState('');
  const [status, setStatus] = useState<InstitutionStatus>('active');
  const [staffLevels, setStaffLevels] = useState<StaffLevels>(0);
  const [permissions, setPermissions] = useState<InstitutionPermissionKey[]>([]);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const [unlinked, setUnlinked] = useState<InstituteAdmin[]>([]);
  const [linkId, setLinkId] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [learnerQuery, setLearnerQuery] = useState('');
  const [learnerOptions, setLearnerOptions] = useState<LearnerRef[]>([]);
  const [learnerId, setLearnerId] = useState('');

  const apply = useCallback((next: InstitutionDetail) => {
    setDetail(next);
    setName(next.name);
    setType(next.type);
    setContactEmail(next.contactEmail ?? '');
    setStatus(next.status);
    setStaffLevels(next.staffLevels);
    setPermissions(next.permissions);
  }, []);

  const loadUnlinked = useCallback(async () => {
    const result = await institutionApi.unlinked();
    if (result.ok) setUnlinked(result.data.items);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    let alive = true;
    void institutionApi.get(institutionId).then((result) => {
      if (!alive) return;
      if (result.ok) apply(result.data);
      else setLoadError(result.error);
    });
    void loadUnlinked();
    return () => {
      alive = false;
    };
  }, [institutionId, apply, loadUnlinked]);

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

  const run = async (task: () => Promise<{ ok: true; data: InstitutionDetail } | { ok: false; error: string }>, message: string) => {
    setBusy(true);
    setError('');
    const result = await task();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    apply(result.data);
    setFlash(message);
    onChanged();
    return true;
  };

  if (!detail) {
    return (
      <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Institution">
          <div className={styles.head}>
            <p className={styles.hint}>{loadError || 'Loading institution…'}</p>
            <button ref={closeRef} type="button" className={styles.close} aria-label="Close institution" onClick={onClose}>
              <X width={18} height={18} aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>
    );
  }

  const detailsDirty = name.trim() !== detail.name || type !== detail.type || contactEmail.trim().toLowerCase() !== (detail.contactEmail ?? '') || status !== detail.status || staffLevels !== detail.staffLevels;
  const permissionsDirty = !sameKeys(permissions, detail.permissions);
  const statusMeta = INSTITUTION_STATUS_META[detail.status];
  const problemTotal = Object.values(detail.problemsByStatus).reduce((sum, value) => sum + value, 0);

  const saveDetails = async (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return setError('Enter the institution’s name');
    const email = contactEmail.trim().toLowerCase();
    if (email && !EMAIL_PATTERN.test(email)) return setError('Enter a valid contact email');
    await run(() => institutionApi.update(detail.id, { name: name.trim(), type, status, staffLevels, ...(email ? { contactEmail: email } : {}) }), 'Details saved');
  };

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (inviteName.trim().length < 2) return setError('Enter the admin’s full name');
    if (!EMAIL_PATTERN.test(email)) return setError('Enter a valid email address');
    setBusy(true);
    setError('');
    const result = await institutionApi.invite(detail.id, inviteName.trim(), email);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setCredential({ email, password: result.data.temporaryPassword });
    setInviteName('');
    setInviteEmail('');
    const refreshed = await institutionApi.get(detail.id);
    if (refreshed.ok) apply(refreshed.data);
    onChanged();
  };

  const findLearners = async () => {
    const result = await institutionApi.unlinkedLearners(learnerQuery.trim());
    if (result.ok) {
      setLearnerOptions(result.data.items);
      setLearnerId(result.data.items[0]?.id ?? '');
      if (result.data.items.length === 0) setError('No unlinked learner matches that search.');
    } else setError(result.error);
  };

  const linkLearner = async () => {
    if (!learnerId) return;
    if (await run(() => institutionApi.linkLearner(detail.id, learnerId), 'Learner linked')) {
      setLearnerId('');
      setLearnerOptions([]);
      setLearnerQuery('');
    }
  };

  const link = async () => {
    if (!linkId) return;
    if (await run(() => institutionApi.link(detail.id, linkId), 'Admin linked')) {
      setLinkId('');
      void loadUnlinked();
    }
  };

  const revoke = async (event: FormEvent, admin: InstituteAdmin) => {
    event.preventDefault();
    if (reason.trim().length < 5) return setError('Give a reason of at least 5 characters. It is shown in the audit log.');
    if (await run(() => institutionApi.revoke(detail.id, admin.id, reason.trim()), `Revoked ${admin.name}`)) {
      setRevokingId(null);
      setReason('');
    }
  };

  const facts: [string, string][] = [
    ['Code', detail.code],
    ['Type', TYPE_LABEL[detail.type]],
    ['Registered', formatDate(detail.createdAt)],
    ['Registered by', detail.createdBy],
    ['Problems', String(problemTotal)],
    ['Learners', `${detail.learners.active} active${detail.learners.revoked ? `, ${detail.learners.revoked} revoked` : ''}`],
    ['Contact', detail.contactEmail ?? 'Not set'],
    ['Hierarchy', HIERARCHY_OPTIONS.find((item) => item.value === detail.staffLevels)?.description ?? ''],
    ['Environment', detail.environment === 'predefined' ? 'Predefined content' : 'Empty'],
  ];

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="institution-title">
        <div className={styles.head}>
          <div className={styles.profile}>
            <span className={styles.bigAvatar} aria-hidden="true">
              <Building2 width={22} height={22} />
            </span>
            <div className={styles.headText}>
              <h2 id="institution-title" className={styles.title}>
                {detail.name}
              </h2>
              <div className={styles.badges}>
                <span className={cx(styles.badge, styles[`tone_${statusMeta.tone}`])}>{statusMeta.label}</span>
                <span className={cx(styles.badge, styles.tone_neutral)}>{TYPE_LABEL[detail.type]}</span>
              </div>
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} aria-label="Close institution" onClick={onClose}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        {detail.status === 'suspended' && (
          <div className={styles.suspendedBox}>
            <strong>Suspended</strong>
            <span>Its Institute Admins are signed out and cannot use any feature until you reactivate it.</span>
          </div>
        )}

        {error && (
          <p className={styles.errorText} role="alert">
            {error}
          </p>
        )}
        {flash && (
          <p className={styles.flash} role="status">
            {flash}
          </p>
        )}
        {credential && (
          <p className={styles.flash} role="status">
            {`Temporary password for ${credential.email}: `}
            <code className={styles.mono}>{credential.password}</code>
            {' — share it securely. It is shown only once.'}
          </p>
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
          <h3 className={styles.sectionTitle}>Permissions</h3>
          <p className={styles.hint}>Applies to every Institute Admin of this institution. Changes take effect on their next request.</p>
          <ul className={own.permRows}>
            {INSTITUTION_PERMISSION_ITEMS.map((item) => (
              <li key={item.key}>
                <label className={own.permRow}>
                  <input
                    type="checkbox"
                    checked={permissions.includes(item.key)}
                    onChange={() => setPermissions((current) => (current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key]))}
                    aria-label={item.label}
                  />
                  <span className={own.permText}>
                    <span className={own.permName}>{item.label}</span>
                    <span className={own.permDesc}>{item.description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className={styles.formActions}>
            <button type="button" className={styles.ghostButton} disabled={!permissionsDirty || busy} onClick={() => setPermissions(detail.permissions)}>
              Reset
            </button>
            <button type="button" className={styles.primaryButton} disabled={!permissionsDirty || busy} onClick={() => void run(() => institutionApi.setPermissions(detail.id, permissions), 'Permissions saved')}>
              Save permissions
            </button>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{`Institute Admins (${detail.admins.length})`}</h3>
          {detail.admins.length === 0 ? (
            <p className={styles.hint}>No admins yet. Invite one below.</p>
          ) : (
            <ul className={own.adminList}>
              {detail.admins.map((admin) => {
                const meta = ADMIN_STATUS_META[admin.status];
                return (
                  <li key={admin.id} className={own.adminRow}>
                    <span className={own.adminInfo}>
                      <span className={own.adminName}>{admin.name}</span>
                      <span className={own.adminMeta}>{`${admin.email} · ${admin.status === 'invited' ? 'not signed in yet' : `last sign-in ${formatAgo(admin.lastSignInAt, now)}`}`}</span>
                      {admin.status === 'revoked' && admin.revokeReason && <span className={own.adminMeta}>{`Revoked: ${admin.revokeReason}`}</span>}
                    </span>
                    <span className={cx(styles.badge, styles[`tone_${meta.tone}`])}>{meta.label}</span>
                    {admin.status === 'revoked' ? (
                      <button type="button" className={styles.ghostButton} disabled={busy} onClick={() => void run(() => institutionApi.restore(detail.id, admin.id), `Restored ${admin.name}`)}>
                        <RotateCcw width={14} height={14} aria-hidden="true" />
                        Restore
                      </button>
                    ) : revokingId === admin.id ? (
                      <form className={own.revokeForm} onSubmit={(event) => void revoke(event, admin)}>
                        <input className={styles.control} value={reason} placeholder="Reason (shown in the audit log)" onChange={(event) => setReason(event.target.value)} aria-label={`Reason for revoking ${admin.name}`} />
                        <button type="submit" className={styles.dangerButton} disabled={busy}>
                          Revoke
                        </button>
                        <button type="button" className={styles.ghostButton} onClick={() => setRevokingId(null)}>
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button type="button" className={styles.ghostButton} onClick={() => setRevokingId(admin.id)}>
                        Revoke
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form className={own.inlineForm} onSubmit={(event) => void invite(event)}>
            <label className={styles.field}>
              <span className={styles.label}>Full name</span>
              <input className={styles.control} value={inviteName} placeholder="e.g. Priya Nair" onChange={(event) => setInviteName(event.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Work email</span>
              <input className={styles.control} type="email" value={inviteEmail} placeholder="priya@institution.edu" onChange={(event) => setInviteEmail(event.target.value)} />
            </label>
            <button type="submit" className={styles.primaryButton} disabled={busy || detail.status !== 'active'} title={detail.status !== 'active' ? 'Reactivate the institution first' : undefined}>
              <Send width={14} height={14} aria-hidden="true" />
              Invite
            </button>
          </form>

          {unlinked.length > 0 && (
            <div className={own.linkForm}>
              <label className={styles.field}>
                <span className={styles.label}>Link an existing Institute Admin</span>
                <select className={styles.control} value={linkId} onChange={(event) => setLinkId(event.target.value)}>
                  <option value="">Choose an unlinked admin</option>
                  {unlinked.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {`${admin.name} (${admin.email})`}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className={styles.ghostButton} disabled={!linkId || busy} onClick={() => void link()}>
                <Link2 width={14} height={14} aria-hidden="true" />
                Link
              </button>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Learners</h3>
          <p className={own.hint}>Institute Admins invite and manage learners from their Learners page. Link an existing learner account here.</p>
          <div className={own.linkForm}>
            <label className={styles.field}>
              <span className={styles.label}>Find an unlinked learner</span>
              <input
                className={styles.control}
                value={learnerQuery}
                placeholder="Name or email"
                onChange={(event) => setLearnerQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void findLearners();
                  }
                }}
              />
            </label>
            <button type="button" className={styles.ghostButton} disabled={busy} onClick={() => void findLearners()}>
              Find
            </button>
          </div>
          {learnerOptions.length > 0 && (
            <div className={own.linkForm}>
              <label className={styles.field}>
                <span className={styles.label}>Learner</span>
                <select className={styles.control} value={learnerId} onChange={(event) => setLearnerId(event.target.value)}>
                  {learnerOptions.map((learner) => (
                    <option key={learner.id} value={learner.id}>
                      {`${learner.name} (${learner.email})`}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className={styles.ghostButton} disabled={!learnerId || busy} onClick={() => void linkLearner()}>
                <Link2 width={14} height={14} aria-hidden="true" />
                Link
              </button>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Details</h3>
          <form onSubmit={(event) => void saveDetails(event)}>
            <div className={styles.twoFields}>
              <label className={styles.field}>
                <span className={styles.label}>Name</span>
                <input className={styles.control} value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Type</span>
                <select className={styles.control} value={type} onChange={(event) => setType(event.target.value as InstitutionType)}>
                  {INSTITUTION_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Contact email</span>
                <input className={styles.control} type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Status</span>
                <select className={styles.control} value={status} onChange={(event) => setStatus(event.target.value as InstitutionStatus)}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Hierarchy levels</span>
                <select className={styles.control} value={staffLevels} onChange={(event) => setStaffLevels(Number(event.target.value) as StaffLevels)}>
                  {HIERARCHY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {`${item.label} — ${item.description}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={status === 'suspended' && detail.status === 'active' ? styles.dangerButton : styles.primaryButton} disabled={!detailsDirty || busy}>
                {status === 'suspended' && detail.status === 'active' ? 'Suspend institution' : 'Save details'}
              </button>
            </div>
          </form>
        </section>
      </aside>
    </div>
  );
}