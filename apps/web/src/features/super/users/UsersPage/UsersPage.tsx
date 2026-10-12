'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronRight, Download, RotateCcw, Search, UserPlus } from 'lucide-react';
import { useUsers } from '../lib/api';
import { INSTITUTIONS, PLAN_META, ROLE_META, STATUS_META, cx, formatAgo, initials, toCsv } from '../lib/shared';
import type { PlatformUser, UserRole } from '../lib/types';
import { InviteModal } from '../InviteModal/InviteModal';
import { UserDrawer } from '../UserDrawer/UserDrawer';
import styles from '../ui/users.module.css';

type Tab = 'all' | UserRole;
const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All users' },
  { value: 'learner', label: 'Learners' },
  { value: 'instructor', label: 'Instructors' },
  { value: 'institution_admin', label: 'Institution admins' },
];

const PAGE = 25;
const DAY = 86_400_000;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function UsersPage() {
  const store = useUsers();
  const { items, loaded, refresh, error, clearError } = store;
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [institution, setInstitution] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState('');
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
    const month = new Date(now || 0);
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    return {
      total: items.length,
      active30: items.filter((user) => user.lastActiveAt && now - user.lastActiveAt < 30 * DAY && (user.status === 'active' || user.status === 'trial')).length,
      paid: items.filter((user) => user.status === 'active' && PLAN_META[user.plan].paid && user.plan !== 'enterprise').length,
      seats: items.filter((user) => user.status === 'active' && user.plan === 'enterprise').length,
      trial: items.filter((user) => user.status === 'trial').length,
      deactivated: items.filter((user) => user.status === 'deactivated').length,
      newMonth: items.filter((user) => user.joinedAt >= month.getTime()).length,
      invited: items.filter((user) => user.status === 'invited').length,
      suspended: items.filter((user) => user.status === 'suspended').length,
    };
  }, [items, now]);

  const counts = useMemo(() => Object.fromEntries(TABS.map((item) => [item.value, item.value === 'all' ? items.length : items.filter((user) => user.role === item.value).length])) as Record<Tab, number>, [items]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((user) => {
      if (tab !== 'all' && user.role !== tab) return false;
      if (institution && user.institution !== institution) return false;
      if (plan && user.plan !== plan) return false;
      if (status && user.status !== status) return false;
      if (q && !`${user.name} ${user.email} ${user.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, tab, query, institution, plan, status]);

  const visible = rows.slice(0, limit);
  const allVisibleSelected = visible.length > 0 && visible.every((user) => selected.has(user.id));
  const selectedUsers = items.filter((user) => selected.has(user.id));
  const open = openId ? items.find((user) => user.id === openId) ?? null : null;

  const filter = <T,>(fn: (value: T) => void) => (value: T) => {
    fn(value);
    setLimit(PAGE);
  };

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visible.forEach((user) => next.delete(user.id));
      else visible.forEach((user) => next.add(user.id));
      return next;
    });

  const clearSelection = () => {
    setSelected(new Set());
    setBulkReason(null);
    setBulkError('');
  };

  const submitBulkSuspend = async (event: FormEvent) => {
    event.preventDefault();
    if (!bulkReason || bulkReason.trim().length < 5) {
      setBulkError('Give a reason of at least 5 characters');
      return;
    }
    const ids = selectedUsers.filter((user) => user.status !== 'suspended' && user.status !== 'deactivated').map((user) => user.id);
    const done = await store.suspend(ids, bulkReason.trim());
    setNotice(`Suspended ${done} user${done === 1 ? '' : 's'}`);
    clearSelection();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.subtitle}>Learner accounts across eLab. Admins are managed under Admins &amp; Permissions.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.ghostButton} onClick={() => download(`elab-users-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))} disabled={!loaded || rows.length === 0}>
            <Download width={16} height={16} aria-hidden="true" />
            Export CSV
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setInviting(true)} disabled={!loaded}>
            <UserPlus width={16} height={16} aria-hidden="true" />
            Invite users
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

      {store.credentials.length > 0 && !open && (
        <div className={styles.notice} role="status">
          <span>{store.credentials.length === 1 ? 'Temporary password — share it securely; it is shown only once:' : 'Temporary passwords — share them securely; they are shown only once:'}</span>
          {store.credentials.map((item) => (
            <span key={item.email}>
              {` ${item.email}: `}
              <code>{item.password}</code>
            </span>
          ))}
          <button type="button" className={styles.errorDismiss} onClick={store.clearCredentials} aria-label="Dismiss passwords">
            ×
          </button>
        </div>
      )}
      </div>

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? stats.total.toLocaleString('en-IN') : '—'}</span>
          <span className={styles.statLabel}>Total users</span>
          <span className={styles.statFoot}>{loaded && now ? `${stats.newMonth} new this month · ${stats.invited} invited` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statSuccess)}>{loaded && now ? stats.active30.toLocaleString('en-IN') : '—'}</span>
          <span className={styles.statLabel}>Active in 30 days</span>
          <span className={styles.statFoot}>{loaded && now && stats.total ? `${Math.round((stats.active30 / stats.total) * 100)}% of all users` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statPrimary)}>{loaded ? stats.paid.toLocaleString('en-IN') : '—'}</span>
          <span className={styles.statLabel}>Paid individual plans</span>
          <span className={styles.statFoot}>{loaded ? `${stats.seats} enterprise seats · ${stats.trial} on trial` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats.suspended > 0 && styles.statDanger)}>{loaded ? stats.suspended : '—'}</span>
          <span className={styles.statLabel}>Suspended</span>
          <span className={styles.statFoot}>{loaded ? `Cannot sign in · ${stats.deactivated} deactivated` : 'Cannot sign in'}</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="User role">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                className={cx(styles.segment, tab === item.value && styles.segmentActive)}
                onClick={() => filter(setTab)(item.value)}
              >
                {item.label}
                <span className={styles.segmentCount}>{counts[item.value] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search by name, email or ID" value={query} onChange={(event) => filter(setQuery)(event.target.value)} aria-label="Search users" />
          </div>
          <select className={styles.select} value={institution} onChange={(event) => filter(setInstitution)(event.target.value)} aria-label="Filter by institution">
            <option value="">All institutions</option>
            {INSTITUTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={plan} onChange={(event) => filter(setPlan)(event.target.value)} aria-label="Filter by plan">
            <option value="">All plans</option>
            {Object.entries(PLAN_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={status} onChange={(event) => filter(setStatus)(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {selected.size > 0 && (
          <div className={styles.bulkBar} role="region" aria-label="Bulk actions">
            <strong>{`${selected.size} selected`}</strong>
            {bulkReason === null ? (
              <div className={styles.bulkActions}>
                <button
                  type="button"
                  className={cx(styles.bulkButton, styles.bulkSuccess)}
                  onClick={async () => {
                    const ids = selectedUsers.filter((user) => user.status === 'suspended' || user.status === 'deactivated').map((user) => user.id);
                    const done = ids.length ? await store.reactivate(ids) : 0;
                    setNotice(ids.length ? `Reactivated ${done} user${done === 1 ? '' : 's'}` : 'None of the selected users were suspended or deactivated');
                    clearSelection();
                  }}
                >
                  Reactivate
                </button>
                <button type="button" className={cx(styles.bulkButton, styles.bulkDanger)} onClick={() => setBulkReason('')}>
                  Suspend
                </button>
                <button type="button" className={styles.bulkButton} onClick={() => download(`elab-users-selected-${selected.size}.csv`, toCsv(selectedUsers))}>
                  Export
                </button>
                <button type="button" className={styles.bulkLink} onClick={clearSelection}>
                  Clear
                </button>
              </div>
            ) : (
              <form className={styles.bulkForm} onSubmit={submitBulkSuspend} noValidate>
                <input
                  className={cx(styles.input, bulkError && styles.inputError)}
                  placeholder="Reason for suspending"
                  value={bulkReason}
                  autoFocus
                  onChange={(event) => {
                    setBulkReason(event.target.value);
                    setBulkError('');
                  }}
                  aria-label="Reason for suspending"
                  aria-invalid={bulkError ? true : undefined}
                />
                <button type="submit" className={cx(styles.bulkButton, styles.bulkDanger)}>
                  Suspend
                </button>
                <button type="button" className={styles.bulkLink} onClick={() => setBulkReason(null)}>
                  Cancel
                </button>
                {bulkError && <span className={styles.bulkError}>{bulkError}</span>}
              </form>
            )}
          </div>
        )}

        {loaded && rows.length > 0 && <p className={styles.count}>{`Showing ${visible.length} of ${rows.length.toLocaleString('en-IN')} users`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No users match the current filters.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.checkCell}>
                      <input type="checkbox" className={styles.checkbox} checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all shown users" />
                    </th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Institution</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Last active</th>
                    <th className={styles.actionsHead}>
                      <span className={styles.srOnly}>Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user: PlatformUser) => {
                    const st = STATUS_META[user.status];
                    const pl = PLAN_META[user.plan];
                    const isSelected = selected.has(user.id);
                    return (
                      <tr key={user.id} className={cx(styles.clickRow, isSelected && styles.rowSelected)} onClick={() => setOpenId(user.id)}>
                        <td className={styles.checkCell} onClick={(event) => event.stopPropagation()}>
                          <input type="checkbox" className={styles.checkbox} checked={isSelected} onChange={() => toggle(user.id)} aria-label={`Select ${user.name}`} />
                        </td>
                        <td>
                          <div className={styles.userCell}>
                            <span className={styles.userAvatar} aria-hidden="true">
                              {initials(user.name)}
                            </span>
                            <span>
                              <button
                                type="button"
                                className={styles.rowLink}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenId(user.id);
                                }}
                              >
                                {user.name}
                              </button>
                              <span className={styles.meta}>{user.email}</span>
                            </span>
                          </div>
                        </td>
                        <td className={styles.nowrap}>{ROLE_META[user.role].label}</td>
                        <td className={styles.instCell}>{user.institution}</td>
                        <td>
                          <span className={cx(styles.badge, styles[`tone_${pl.tone}`])}>{pl.label}</span>
                        </td>
                        <td>
                          <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
                        </td>
                        <td className={cx(styles.nowrap, styles.muted)}>{now ? formatAgo(user.lastActiveAt, now) : ''}</td>
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
            {rows.length > visible.length && (
              <div className={styles.more}>
                <button type="button" className={styles.ghostButton} onClick={() => setLimit((value) => value + PAGE)}>
                  {`Show ${Math.min(PAGE, rows.length - visible.length)} more`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {open && <UserDrawer key={open.id} user={open} now={now || Date.now()} store={store} onClose={() => setOpenId(null)} />}
      {inviting && (
        <InviteModal
          existingEmails={new Set(items.map((user) => user.email.toLowerCase()))}
          onCancel={() => setInviting(false)}
          onSubmit={async (input) => {
            const count = await store.invite(input);
            setInviting(false);
            if (!count) return;
            setTab('all');
            setStatus('');
            setNotice(`Created ${count} learner account${count === 1 ? '' : 's'}`);
          }}
        />
      )}
    </div>
  );
}
