'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Plus, RotateCcw, Search } from 'lucide-react';
import { displayStatus, rolloutPercent, whenText } from '../lib/display';
import { activeRollout, currentLive, useReleases } from '../lib/api';
import { STAGES, TYPE_META, compareVersions, cx, formatIn, initials } from '../lib/shared';
import type { Release } from '../lib/types';
import { ReleaseDrawer } from '../ReleaseDrawer/ReleaseDrawer';
import { ReleaseModal } from '../ReleaseModal/ReleaseModal';
import styles from '../ui/releases.module.css';

type Tab = 'all' | 'upcoming' | 'progress' | 'shipped';

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'progress', label: 'In progress' },
  { value: 'shipped', label: 'Shipped' },
];

const DAY = 86_400_000;

const inTab = (release: Release, tab: Tab) => {
  if (tab === 'upcoming') return release.status === 'draft' || release.status === 'scheduled';
  if (tab === 'progress') return release.status === 'rolling' || release.status === 'paused';
  if (tab === 'shipped') return release.status === 'live' || release.status === 'rolled_back';
  return true;
};

export default function ReleasesPage() {
  const store = useReleases();
  const { items, loaded, refresh, error, clearError } = store;
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const current = currentLive(items);
  const rolling = activeRollout(items);

  const stats = useMemo(() => {
    const scheduled = items.filter((item) => item.status === 'scheduled' && item.scheduledAt).sort((a, b) => a.scheduledAt! - b.scheduledAt!);
    const recent = items.filter((item) => (item.status === 'live' || item.status === 'rolled_back') && item.completedAt && now && item.completedAt >= now - 90 * DAY);
    const failed = recent.filter((item) => item.status === 'rolled_back').length;
    return { scheduled, recent: recent.length, failed, rate: recent.length ? failed / recent.length : 0 };
  }, [items, now]);

  const counts = useMemo(() => Object.fromEntries(TABS.map((item) => [item.value, items.filter((release) => inTab(release, item.value)).length])) as Record<Tab, number>, [items]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((release) => inTab(release, tab) && (!type || release.type === type) && (!q || `${release.version} ${release.title} ${release.owner}`.toLowerCase().includes(q)))
      .sort((a, b) => compareVersions(b.version, a.version));
  }, [items, tab, query, type]);

  const open = openId ? items.find((release) => release.id === openId) ?? null : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Releases</h1>
          <p className={styles.subtitle}>Plan, roll out and roll back platform releases</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setCreating(true)} disabled={!loaded}>
            <Plus width={16} height={16} aria-hidden="true" />
            New release
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
          <span className={cx(styles.statValue, styles.monoValue, styles.statSuccess)}>{loaded ? current?.version ?? '—' : '—'}</span>
          <span className={styles.statLabel}>In production</span>
          <span className={styles.statFoot}>{current ? current.title : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, rolling && styles.statWarn)}>{loaded ? (rolling ? `${STAGES[rolling.stage]}%` : '—') : '—'}</span>
          <span className={styles.statLabel}>Rolling out now</span>
          <span className={styles.statFoot}>{rolling ? `${rolling.version}${rolling.status === 'paused' ? ' · paused' : ''}` : 'No rollout in progress'}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? stats.scheduled.length : '—'}</span>
          <span className={styles.statLabel}>Scheduled</span>
          <span className={styles.statFoot}>{stats.scheduled[0] && now ? `Next ${stats.scheduled[0].version} ${formatIn(stats.scheduled[0].scheduledAt!, now)}` : 'Nothing scheduled'}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats.rate > 0.15 && styles.statDanger)}>{loaded && now && stats.recent ? `${Math.round(stats.rate * 100)}%` : '—'}</span>
          <span className={styles.statLabel}>Change failure rate</span>
          <span className={styles.statFoot}>{`${stats.failed} of ${stats.recent} releases rolled back · 90 days`}</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Release status">
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

        <div className={cx(styles.toolbar, styles.toolbar2)}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search by version, title or owner" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search releases" />
          </div>
          <select className={styles.select} value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            {Object.entries(TYPE_META).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loaded && rows.length > 0 && <p className={styles.count}>{`${rows.length} release${rows.length === 1 ? '' : 's'}`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No releases match the current filters.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Release</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Rollout</th>
                  <th>Owner</th>
                  <th>When</th>
                  <th className={styles.actionsHead}>
                    <span className={styles.srOnly}>Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((release) => {
                  const status = displayStatus(release, current?.id ?? null);
                  const percent = rolloutPercent(release);
                  const barTone = release.status === 'rolled_back' ? 'neutral' : release.status === 'paused' ? 'danger' : release.status === 'live' ? 'success' : 'warning';
                  return (
                    <tr key={release.id} className={styles.clickRow} onClick={() => setOpenId(release.id)}>
                      <td className={styles.reportCell}>
                        <button
                          type="button"
                          className={cx(styles.rowLink, styles.mono)}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenId(release.id);
                          }}
                        >
                          {release.version}
                          {release.id === current?.id && <span className={styles.prodTag}>Production</span>}
                        </button>
                        <span className={styles.meta}>{release.title}</span>
                      </td>
                      <td>
                        <span className={styles.tag}>{TYPE_META[release.type]}</span>
                      </td>
                      <td>
                        <span className={cx(styles.badge, styles[`tone_${status.tone}`])}>{status.label}</span>
                      </td>
                      <td>
                        {release.status === 'draft' || release.status === 'scheduled' ? (
                          <span className={styles.muted}>—</span>
                        ) : (
                          <span className={styles.rollout}>
                            <span className={styles.rolloutTrack} aria-hidden="true">
                              <span className={cx(styles.rolloutFill, styles[`fill_${barTone}`])} style={{ width: `${percent}%` }} />
                            </span>
                            <span className={styles.rolloutValue}>{`${percent}%`}</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={styles.assignee}>
                          <span className={styles.avatar} aria-hidden="true">
                            {initials(release.owner)}
                          </span>
                          {release.owner}
                        </span>
                      </td>
                      <td className={cx(styles.whenCell, styles.muted)}>{now ? whenText(release, now) : ''}</td>
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

      {open && <ReleaseDrawer key={open.id} release={open} now={now || Date.now()} store={store} isCurrent={open.id === current?.id} blockedBy={rolling && rolling.id !== open.id ? rolling.version : null} onClose={() => setOpenId(null)} />}
      {creating && (
        <ReleaseModal
          existing={items}
          owners={store.owners}
          onCancel={() => setCreating(false)}
          onSubmit={async (input) => {
            const id = await store.create(input);
            setCreating(false);
            if (id) setOpenId(id);
          }}
        />
      )}
    </div>
  );
}