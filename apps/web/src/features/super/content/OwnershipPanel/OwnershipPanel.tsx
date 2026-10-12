'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cx } from '../lib/shared';
import { useOwnership, type OwnershipFilters, type OwnershipRow } from '../lib/ownership';
import styles from '../ui/catalog.module.css';

const STATUS_META: Record<OwnershipRow['status'], { label: string; tone: string }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  review: { label: 'In review', tone: 'warning' },
  ready: { label: 'Ready to publish', tone: 'primary' },
  published: { label: 'Published', tone: 'success' },
  deprecated: { label: 'Deprecated', tone: 'danger' },
};

function formatDay(t: number) {
  return new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function OwnershipPanel() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [assignee, setAssignee] = useState('');
  const filters = useMemo<OwnershipFilters>(() => ({ q: q.trim(), status, assignee }), [q, status, assignee]);
  const { rows, loaded, total, unassigned, managers, error, clearError, assign } = useOwnership(filters);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  async function change(row: OwnershipRow, value: string) {
    setBusyId(row.id);
    const failed = await assign(row.id, value || null);
    setBusyId(null);
    const name = managers.find((manager) => manager.id === value)?.name;
    setNotice(failed ?? (name ? `Assigned "${row.title}" to ${name}` : `Removed the assignee from "${row.title}"`));
  }

  return (
    <>
      <section className={styles.stats} aria-label="Ownership summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? total : '—'}</span>
          <span className={styles.statLabel}>Problems shown</span>
          <span className={styles.statFoot}>Every stage, not just the live catalog</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, loaded && unassigned > 0 && styles.statWarn)}>{loaded ? unassigned : '—'}</span>
          <span className={styles.statLabel}>Unassigned</span>
          <span className={styles.statFoot}>Not deprecated and without a content manager</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{managers.length}</span>
          <span className={styles.statLabel}>Active content managers</span>
          <span className={styles.statFoot}>Invite more from Admins &amp; Permissions</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={cx(styles.toolbar, styles.toolbarThree)}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search by title or slug" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Search problems" />
          </div>
          <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={assignee} onChange={(event) => setAssignee(event.target.value)} aria-label="Filter by assignee">
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {`${manager.name} (${manager.assigned})`}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>{error}</span>
            <button type="button" className={styles.errorDismiss} onClick={clearError} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No problems match these filters.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Status</th>
                  <th>Created by</th>
                  <th>Assigned content manager</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className={styles.nameLine}>{row.title}</span>
                      <span className={styles.meta}>{`${row.technology.name} · ${row.difficulty} · ${row.slug}`}</span>
                    </td>
                    <td>
                      <span className={cx(styles.badge, styles[`tone_${STATUS_META[row.status].tone}`])}>{STATUS_META[row.status].label}</span>
                    </td>
                    <td>
                      <span className={styles.nameLine}>{row.createdBy?.name ?? 'Unknown'}</span>
                      <span className={styles.meta}>{row.createdBy?.role ?? ''}</span>
                    </td>
                    <td>
                      <select
                        className={styles.select}
                        value={row.assignee?.id ?? ''}
                        disabled={busyId === row.id || row.status === 'deprecated'}
                        onChange={(event) => void change(row, event.target.value)}
                        aria-label={`Assign ${row.title}`}
                      >
                        <option value="">Unassigned</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))}
                      </select>
                      {row.assignedAt && <span className={styles.meta}>{`Since ${formatDay(row.assignedAt)}`}</span>}
                    </td>
                    <td className={styles.nowrap}>{formatDay(row.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
