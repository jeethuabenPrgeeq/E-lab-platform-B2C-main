'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Plus, RotateCcw, Search } from 'lucide-react';
import { useCatalog } from '../../content/lib/api';
import { useChallenges } from '../lib/api';
import { KIND_META, STATUS_META, cx, formatCount, formatRelative, formatRupees, formatWhen, statusOf } from '../lib/shared';
import type { Challenge, ChallengeStatus } from '../lib/types';
import { ChallengeDrawer } from '../ChallengeDrawer/ChallengeDrawer';
import { ChallengeModal } from '../ChallengeModal/ChallengeModal';
import styles from '../ui/challenges.module.css';

type Tab = 'all' | ChallengeStatus;

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'scheduled', label: 'Upcoming' },
  { value: 'draft', label: 'Drafts' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ORDER: Record<ChallengeStatus, number> = { live: 0, scheduled: 1, draft: 2, ended: 3, cancelled: 4 };
const DAY = 86_400_000;

export default function ChallengesPage() {
  const store = useChallenges();
  const catalog = useCatalog();
  const { items, loaded, refresh, error, clearError } = store;
  const [now, setNow] = useState(0);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Challenge | 'new' | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const ready = loaded && now > 0;

  const withStatus = useMemo(() => items.map((challenge) => ({ challenge, status: ready ? statusOf(challenge, now) : ('draft' as ChallengeStatus) })), [items, now, ready]);

  const stats = useMemo(() => {
    const live = withStatus.filter((row) => row.status === 'live');
    const upcoming = withStatus.filter((row) => row.status === 'scheduled').sort((a, b) => a.challenge.startAt - b.challenge.startAt);
    const recent = withStatus.filter((row) => (row.status === 'ended' && now - row.challenge.endAt < 30 * DAY) || row.status === 'live');
    const ended = withStatus.filter((row) => row.status === 'ended' && row.challenge.registered > 0);
    const turnout = ended.length ? Math.round((ended.reduce((sum, row) => sum + row.challenge.participants / row.challenge.registered, 0) / ended.length) * 100) : 0;
    return {
      live: live.length,
      liveParticipants: live.reduce((sum, row) => sum + row.challenge.participants, 0),
      next: upcoming[0]?.challenge ?? null,
      upcoming: upcoming.length,
      participants: recent.reduce((sum, row) => sum + row.challenge.participants, 0),
      turnout,
    };
  }, [withStatus, now]);

  const counts = useMemo(() => {
    const map: Record<Tab, number> = { all: items.length, live: 0, scheduled: 0, draft: 0, ended: 0, cancelled: 0 };
    for (const row of withStatus) map[row.status] += 1;
    return map;
  }, [withStatus, items.length]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withStatus
      .filter(({ challenge, status }) => {
        if (tab !== 'all' && status !== tab) return false;
        if (kind && challenge.kind !== kind) return false;
        if (q && !`${challenge.title} ${challenge.id} ${challenge.sponsor ?? ''}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.status === 'ended' || a.status === 'cancelled' ? b.challenge.startAt - a.challenge.startAt : a.challenge.startAt - b.challenge.startAt));
  }, [withStatus, tab, kind, query]);

  const open = openId ? items.find((challenge) => challenge.id === openId) ?? null : null;
  const { focus } = store;
  useEffect(() => focus(openId), [focus, openId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Challenges</h1>
          <p className={styles.subtitle}>Timed contests, long challenges and hiring events</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setEditing('new')} disabled={!loaded || !catalog.loaded}>
            <Plus width={16} height={16} aria-hidden="true" />
            New challenge
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
      </div>

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, ready && stats.live > 0 && styles.statDanger)}>{ready ? stats.live : '—'}</span>
          <span className={styles.statLabel}>Live now</span>
          <span className={styles.statFoot}>{ready ? `${formatCount(stats.liveParticipants)} taking part` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ready ? (stats.next ? formatRelative(stats.next.startAt, now).replace(/^in /, '') : '—') : '—'}</span>
          <span className={styles.statLabel}>Until the next one</span>
          <span className={styles.statFoot}>{ready ? (stats.next ? stats.next.title : 'Nothing scheduled') : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ready ? formatCount(stats.participants) : '—'}</span>
          <span className={styles.statLabel}>Participants, last 30 days</span>
          <span className={styles.statFoot}>Includes live challenges</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statSuccess)}>{ready ? `${stats.turnout}%` : '—'}</span>
          <span className={styles.statLabel}>Average turnout</span>
          <span className={styles.statFoot}>Registered who actually took part</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Challenge status">
            {TABS.map((item) => (
              <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className={cx(styles.segment, tab === item.value && styles.segmentActive)} onClick={() => setTab(item.value)}>
                {item.label}
                <span className={styles.segmentCount}>{ready ? counts[item.value] : 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={cx(styles.toolbar, styles.toolbarTwo)}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search by title, ID or sponsor" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search challenges" />
          </div>
          <select className={styles.select} value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            {Object.entries(KIND_META).map(([value, meta]) => (
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

        {!ready ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No challenges match the current filters.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={cx(styles.table, styles.challengeTable)}>
              <thead>
                <tr>
                  <th>Challenge</th>
                  <th>When</th>
                  <th className={styles.numHead}>Problems</th>
                  <th className={styles.numHead}>Registered</th>
                  <th className={styles.numHead}>Took part</th>
                  <th className={styles.numHead}>Prize</th>
                  <th>Status</th>
                  <th className={styles.actionsHead}>
                    <span className={styles.srOnly}>Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ challenge, status }) => {
                  const st = STATUS_META[status];
                  const relative = status === 'live' ? `ends ${formatRelative(challenge.endAt, now)}` : status === 'scheduled' || status === 'draft' ? `starts ${formatRelative(challenge.startAt, now)}` : status === 'ended' ? `ended ${formatRelative(challenge.endAt, now)}` : 'cancelled';
                  return (
                    <tr key={challenge.id} className={cx(styles.clickRow, status === 'cancelled' && styles.rowDim)} onClick={() => setOpenId(challenge.id)}>
                      <td className={styles.contentCell}>
                        <button
                          type="button"
                          className={styles.rowLink}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenId(challenge.id);
                          }}
                        >
                          {challenge.title}
                        </button>
                        <span className={styles.meta}>{`${KIND_META[challenge.kind].label}${challenge.sponsor ? ` · ${challenge.sponsor}` : ''}`}</span>
                      </td>
                      <td className={styles.whenCell}>
                        <span>{formatWhen(challenge.startAt)}</span>
                        <span className={cx(styles.meta, status === 'live' && styles.liveText)}>{relative}</span>
                      </td>
                      <td className={styles.numCell}>{challenge.problems.length}</td>
                      <td className={styles.numCell}>{challenge.registered ? formatCount(challenge.registered) : '—'}</td>
                      <td className={styles.numCell}>{challenge.participants ? formatCount(challenge.participants) : '—'}</td>
                      <td className={styles.numCell}>{challenge.prize ? formatRupees(challenge.prize) : challenge.kind === 'hiring' ? 'Interviews' : '—'}</td>
                      <td>
                        <span className={cx(styles.badge, styles[`tone_${st.tone}`], status === 'live' && styles.livePulse)}>{st.label}</span>
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
      </div>

      {open && ready && catalog.loaded && (
        <ChallengeDrawer
          key={open.id}
          challenge={open}
          now={now}
          catalog={catalog.items}
          store={store}
          onEdit={() => setEditing(open)}
          onNotice={(text) => {
            setNotice(text);
            setNow(Date.now());
          }}
          onOpen={(id) => setOpenId(id)}
          onClose={() => setOpenId(null)}
        />
      )}
      {editing && catalog.loaded && (
        <ChallengeModal
          challenge={editing === 'new' ? null : editing}
          catalog={catalog.items}
          onCancel={() => setEditing(null)}
          onSubmit={async (input, publish) => {
            if (editing === 'new') {
              const result = await store.create(input, publish);
              if (result.id) {
                setEditing(null);
                setTab('all');
                setNotice(publish ? `${input.title.trim()} is scheduled` : `Saved ${input.title.trim()} as a draft`);
                setOpenId(result.id);
              }
              return result.issues;
            }
            const issues = await store.edit(editing.id, input, publish);
            if (!issues.length) {
              setEditing(null);
              setNotice(`Saved ${input.title.trim()}`);
            }
            return issues;
          }}
        />
      )}
    </div>
  );
}
