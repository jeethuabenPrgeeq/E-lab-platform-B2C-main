'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, RotateCcw, Search, Users } from 'lucide-react';
import { useProblemReports } from '../lib/api';
import { CATEGORY_META, PRIORITY_META, STATUS_META, cx, formatAgo, formatDuration, priorityOf } from '../lib/shared';
import type { ProblemReport, ReportStatus } from '../lib/types';
import { ReportDrawer } from '../ReportDrawer/ReportDrawer';
import styles from '../ui/reports.module.css';

const TABS: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export default function ReportsPage() {
  const store = useProblemReports();
  const { items, loaded, refresh, error, clearError } = store;
  const [tab, setTab] = useState<ReportStatus | 'all'>('open');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('reported');
  const [openId, setOpenId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: items.length };
    for (const item of items) out[item.status] = (out[item.status] ?? 0) + 1;
    return out;
  }, [items]);

  const stats = useMemo(() => {
    const active = items.filter((item) => item.status === 'open' || item.status === 'in_review');
    const closed = items.filter((item) => item.resolution);
    const avg = closed.length ? closed.reduce((sum, item) => sum + (item.resolution!.at - item.createdAt), 0) / closed.length : 0;
    return {
      active: active.length,
      high: active.filter((item) => priorityOf(item) === 'high').length,
      unassigned: active.filter((item) => !item.assignee).length,
      learners: active.reduce((sum, item) => sum + item.reports.length, 0),
      avg,
      closed: closed.length,
    };
  }, [items]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (tab !== 'all' && item.status !== tab) return false;
      if (category && item.category !== category) return false;
      if (priority && priorityOf(item) !== priority) return false;
      if (q && !`${item.id} ${item.title} ${item.problem}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === 'newest') return b.updatedAt - a.updatedAt;
      if (sort === 'oldest') return a.createdAt - b.createdAt;
      const rank = PRIORITY_META[priorityOf(a)].rank - PRIORITY_META[priorityOf(b)].rank;
      return rank || b.reports.length - a.reports.length;
    });
  }, [items, tab, query, category, priority, sort]);

  const open = openId ? items.find((item) => item.id === openId) ?? null : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Problem Reports</h1>
          <p className={styles.subtitle}>Issues learners raised about problem statements, test cases and runtimes</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" className={styles.errorDismiss} onClick={clearError} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? stats.active : '—'}</span>
          <span className={styles.statLabel}>Open reports</span>
          <span className={styles.statFoot}>{loaded ? `${stats.learners} learners affected` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats.high > 0 && styles.statDanger)}>{loaded ? stats.high : '—'}</span>
          <span className={styles.statLabel}>High priority</span>
          <span className={styles.statFoot}>Many reporters or a test case issue</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats.unassigned > 0 && styles.statWarn)}>{loaded ? stats.unassigned : '—'}</span>
          <span className={styles.statLabel}>Unassigned</span>
          <span className={styles.statFoot}>Nobody is looking at these yet</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statSuccess)}>{loaded && stats.closed ? formatDuration(stats.avg) : '—'}</span>
          <span className={styles.statLabel}>Avg time to close</span>
          <span className={styles.statFoot}>{loaded ? `Across ${stats.closed} closed reports` : ' '}</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Report status">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                className={cx(styles.segment, tab === item.value && styles.segmentActive)}
                onClick={() => setTab(item.value)}
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
            <input
              className={styles.input}
              placeholder="Search by ID, title or problem"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search reports"
            />
          </div>
          <select className={styles.select} value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {Object.entries(CATEGORY_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {Object.entries(PRIORITY_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort reports">
            <option value="reported">Sort by priority</option>
            <option value="newest">Recently updated</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {loaded && rows.length > 0 && <p className={styles.count}>{`${rows.length} report${rows.length === 1 ? '' : 's'}`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{tab === 'open' && !query && !category && !priority ? 'No open reports. Nice work.' : 'No reports match the current filters.'}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Category</th>
                  <th>Reported by</th>
                  <th>Priority</th>
                  {tab === 'all' && <th>Status</th>}
                  <th>Assignee</th>
                  <th>Updated</th>
                  <th className={styles.actionsHead}>
                    <span className={styles.srOnly}>Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item: ProblemReport) => {
                  const pr = PRIORITY_META[priorityOf(item)];
                  const status = STATUS_META[item.status];
                  const learners = [...new Set(item.reports.map((report) => report.learner))];
                  return (
                    <tr key={item.id} className={styles.clickRow} onClick={() => setOpenId(item.id)}>
                      <td className={styles.reportCell}>
                        <button
                          type="button"
                          className={styles.rowLink}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenId(item.id);
                          }}
                        >
                          {item.title}
                        </button>
                        <span className={styles.meta}>{`${item.id} · ${item.problem}`}</span>
                      </td>
                      <td>
                        <span className={styles.tag}>{CATEGORY_META[item.category].label}</span>
                      </td>
                      <td>
                        <span className={styles.reporters}>
                          <Users width={16} height={16} aria-hidden="true" />
                          {`${learners.length} learner${learners.length === 1 ? '' : 's'}`}
                        </span>
                      </td>
                      <td>
                        <span className={cx(styles.badge, styles[`tone_${pr.tone}`])}>{pr.label}</span>
                      </td>
                      {tab === 'all' && (
                        <td>
                          <span className={cx(styles.badge, styles[`tone_${status.tone}`])}>{status.label}</span>
                        </td>
                      )}
                      <td>
                        {item.assignee ? (
                          <span className={styles.assignee}>
                            <span className={styles.avatar} aria-hidden="true">
                              {initials(item.assignee)}
                            </span>
                            {item.assignee}
                          </span>
                        ) : (
                          <span className={styles.unassigned}>Unassigned</span>
                        )}
                      </td>
                      <td className={cx(styles.nowrap, styles.muted)}>{now ? formatAgo(item.updatedAt, now) : ''}</td>
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
      </div>

      {open && <ReportDrawer key={open.id} report={open} now={now || Date.now()} store={store} onClose={() => setOpenId(null)} />}
    </div>
  );
}