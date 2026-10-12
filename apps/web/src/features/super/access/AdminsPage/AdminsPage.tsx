'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, RotateCcw, Search, ShieldCheck, ShieldOff, UserPlus } from 'lucide-react';
import { useAdminDirectory } from '../lib/api';
import { STATUS_META, cx, formatAgo, initials, isActiveSuper, roleName, roleTone } from '../lib/shared';
import { AdminDrawer } from '../AdminDrawer/AdminDrawer';
import { InviteAdminModal } from '../InviteAdminModal/InviteAdminModal';
import { RolesPanel } from '../RolesPanel/RolesPanel';
import styles from '../ui/admins.module.css';

type View = 'admins' | 'roles';

const DAY = 86_400_000;

export default function AdminsPage() {
  const store = useAdminDirectory();
  const { admins, roles, loaded, refresh, error, clearError } = store;
  const [view, setView] = useState<View>('admins');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const { focus } = store;
  useEffect(() => focus(openId), [focus, openId]);
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(0);

  useEffect(() => setNow(Date.now()), []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const stats = useMemo(() => {
    const active = admins.filter((admin) => admin.status === 'active');
    const withMfa = active.filter((admin) => admin.mfa).length;
    return {
      total: admins.filter((admin) => admin.status !== 'revoked').length,
      invited: admins.filter((admin) => admin.status === 'invited').length,
      supers: admins.filter(isActiveSuper).length,
      mfaPct: active.length ? Math.round((withMfa / active.length) * 100) : 0,
      noMfa: active.length - withMfa,
      stale: now ? active.filter((admin) => !admin.lastSignInAt || now - admin.lastSignInAt > 30 * DAY).length : 0,
    };
  }, [admins, now]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return admins.filter((admin) => {
      if (role && admin.roleId !== role) return false;
      if (status && admin.status !== status) return false;
      if (q && !`${admin.name} ${admin.email} ${admin.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [admins, query, role, status]);

  const open = openId ? admins.find((admin) => admin.id === openId) ?? null : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admins &amp; Permissions</h1>
          <p className={styles.subtitle}>Who can run eLab, and what each role is allowed to do</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setInviting(true)} disabled={!loaded}>
            <UserPlus width={16} height={16} aria-hidden="true" />
            Invite admin
          </button>
        </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" className={styles.errorDismiss} onClick={clearError} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      {store.credential && !open && (
        <div className={styles.notice} role="status">
          {`Temporary password for ${store.credential.email}: `}
          <code>{store.credential.password}</code>
          {' — share it securely; it is shown only once. '}
          <button type="button" className={styles.errorDismiss} onClick={store.clearCredential} aria-label="Dismiss password">
            ×
          </button>
        </div>
      )}
      </div>

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? stats.total : '—'}</span>
          <span className={styles.statLabel}>Admins</span>
          <span className={styles.statFoot}>{loaded ? `${stats.invited} invitation${stats.invited === 1 ? '' : 's'} pending` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, loaded && stats.supers < 2 && styles.statWarn)}>{loaded ? stats.supers : '—'}</span>
          <span className={styles.statLabel}>Super admins</span>
          <span className={styles.statFoot}>{loaded ? (stats.supers < 2 ? 'Only one — add a backup' : 'Full access to everything') : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, loaded && (stats.noMfa > 0 ? styles.statWarn : styles.statSuccess))}>{loaded ? `${stats.mfaPct}%` : '—'}</span>
          <span className={styles.statLabel}>Two-factor enabled</span>
          <span className={styles.statFoot}>{loaded ? (stats.noMfa ? `${stats.noMfa} active admin${stats.noMfa === 1 ? '' : 's'} without it` : 'Every active admin') : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, loaded && now > 0 && stats.stale > 0 && styles.statDanger)}>{loaded && now ? stats.stale : '—'}</span>
          <span className={styles.statLabel}>Inactive 30+ days</span>
          <span className={styles.statFoot}>Review or revoke their access</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected={view === 'admins'} className={cx(styles.segment, view === 'admins' && styles.segmentActive)} onClick={() => setView('admins')}>
              Admins
              <span className={styles.segmentCount}>{admins.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={view === 'roles'} className={cx(styles.segment, view === 'roles' && styles.segmentActive)} onClick={() => setView('roles')}>
              Roles &amp; permissions
              <span className={styles.segmentCount}>{roles.length}</span>
            </button>
          </div>
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        <RolesPanel store={store} hidden={view !== 'roles'} onNotice={setNotice} />
        {view === 'admins' && (
          <>
            <div className={cx(styles.toolbar, styles.toolbarThree)}>
              <div className={styles.searchField}>
                <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
                <input className={styles.input} placeholder="Search by name, email or ID" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search admins" />
              </div>
              <select className={styles.select} value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter by role">
                <option value="">All roles</option>
                {roles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
                <option value="">All statuses</option>
                {Object.entries(STATUS_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            {!loaded ? (
              <div className={styles.empty}>Loading…</div>
            ) : rows.length === 0 ? (
              <div className={styles.empty}>No admins match the current filters.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={cx(styles.table, styles.adminTable)}>
                  <thead>
                    <tr>
                      <th>Admin</th>
                      <th>Role</th>
                      <th>Scope</th>
                      <th>Two-factor</th>
                      <th>Last sign-in</th>
                      <th>Status</th>
                      <th className={styles.actionsHead}>
                        <span className={styles.srOnly}>Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((admin) => {
                      const st = STATUS_META[admin.status];
                      const stale = admin.status === 'active' && now > 0 && (!admin.lastSignInAt || now - admin.lastSignInAt > 30 * DAY);
                      return (
                        <tr key={admin.id} className={cx(styles.clickRow, admin.status === 'revoked' && styles.rowDim)} onClick={() => setOpenId(admin.id)}>
                          <td>
                            <div className={styles.userCell}>
                              <span className={styles.userAvatar} aria-hidden="true">
                                {initials(admin.name)}
                              </span>
                              <span>
                                <span className={styles.nameLine}>
                                  <button
                                    type="button"
                                    className={styles.rowLink}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenId(admin.id);
                                    }}
                                  >
                                    {admin.name}
                                  </button>
                                  {admin.self && <span className={styles.tag}>You</span>}
                                </span>
                                <span className={styles.meta}>{admin.email}</span>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={cx(styles.badge, styles[`tone_${roleTone(admin.roleId)}`])}>{roleName(roles, admin.roleId)}</span>
                          </td>
                          <td className={styles.instCell}>{admin.scope}</td>
                          <td>
                            {admin.status === 'invited' ? (
                              <span className={styles.muted}>After sign-up</span>
                            ) : admin.mfa ? (
                              <span className={styles.mfaOn}>
                                <ShieldCheck width={15} height={15} aria-hidden="true" />
                                On
                              </span>
                            ) : (
                              <span className={styles.mfaOff}>
                                <ShieldOff width={15} height={15} aria-hidden="true" />
                                Off
                              </span>
                            )}
                          </td>
                          <td className={cx(styles.nowrap, stale ? styles.staleText : styles.muted)}>{now ? (admin.status === 'invited' ? '—' : formatAgo(admin.lastSignInAt, now)) : ''}</td>
                          <td>
                            <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
                          </td>
                          <td>
                            <div className={styles.actions}>
                              <span className={styles.iconButton} aria-hidden="true">
                                <ChevronRight width={16} height={16} />
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {open && <AdminDrawer key={open.id} admin={open} now={now || Date.now()} store={store} onClose={() => setOpenId(null)} />}
      {inviting && (
        <InviteAdminModal
          roles={roles}
          existingEmails={new Set(admins.map((admin) => admin.email.toLowerCase()))}
          onCancel={() => setInviting(false)}
          onSubmit={async (input) => {
            const failed = await store.invite(input);
            setInviting(false);
            if (failed) return;
            setView('admins');
            setRole('');
            setStatus('');
            setNotice(`Invited ${input.email}`);
          }}
        />
      )}
    </div>
  );
}