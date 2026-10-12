'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Plus, RotateCcw, Search, TriangleAlert } from 'lucide-react';
import { useCatalog } from '../../content/lib/api';
import { usePaths } from '../lib/api';
import { LEVEL_META, STATUS_META, TIERS, TIER_META, cx, formatCount, formatMinutes, pathMinutes, publishIssues } from '../lib/shared';
import type { PathStatus } from '../lib/types';
import { NewPathModal } from '../NewPathModal/NewPathModal';
import { PathEditor } from '../PathEditor/PathEditor';
import styles from '../ui/paths.module.css';

type Tab = 'all' | PathStatus;

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All paths' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
  { value: 'archived', label: 'Archived' },
];

export default function PathsPage() {
  const store = usePaths();
  const catalog = useCatalog();
  const { paths, loaded, refresh, error, clearError } = store;
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [tier, setTier] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const catalogMap = useMemo(() => new Map(catalog.items.map((item) => [item.id, item])), [catalog.items]);
  const ready = loaded && catalog.loaded;

  const issues = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!ready) return map;
    for (const path of paths) if (path.status !== 'archived') map.set(path.id, publishIssues(path, catalogMap));
    return map;
  }, [paths, catalogMap, ready]);

  const stats = useMemo(() => {
    const published = paths.filter((path) => path.status === 'published');
    const enrolled = published.reduce((sum, path) => sum + path.enrolled, 0);
    const weighted = published.reduce((sum, path) => sum + path.completion * path.enrolled, 0);
    return {
      published: published.length,
      certificates: published.filter((path) => path.certificate).length,
      enrolled,
      completion: enrolled ? Math.round(weighted / enrolled) : 0,
      drafts: paths.filter((path) => path.status === 'draft').length,
      broken: published.filter((path) => (issues.get(path.id) ?? []).length > 0).length,
    };
  }, [paths, issues]);

  const counts = useMemo(() => {
    const map: Record<Tab, number> = { all: paths.length, published: 0, draft: 0, archived: 0 };
    for (const path of paths) map[path.status] += 1;
    return map;
  }, [paths]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return paths.filter((path) => {
      if (tab !== 'all' && path.status !== tab) return false;
      if (level && path.level !== level) return false;
      if (tier && path.tier !== tier) return false;
      if (q && !`${path.title} ${path.id} ${path.summary}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [paths, tab, query, level, tier]);

  const open = openId ? paths.find((path) => path.id === openId) ?? null : null;
  const { focus } = store;
  useEffect(() => focus(openId), [focus, openId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Learning Paths</h1>
          <p className={styles.subtitle}>Guided sequences of problems, projects and labs</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setCreating(true)} disabled={!loaded}>
            <Plus width={16} height={16} aria-hidden="true" />
            New path
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
          <span className={styles.statValue}>{loaded ? stats.published : '—'}</span>
          <span className={styles.statLabel}>Published paths</span>
          <span className={styles.statFoot}>{loaded ? `${stats.certificates} award a certificate` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? formatCount(stats.enrolled) : '—'}</span>
          <span className={styles.statLabel}>Enrolled learners</span>
          <span className={styles.statFoot}>Across published paths</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statSuccess)}>{loaded ? `${stats.completion}%` : '—'}</span>
          <span className={styles.statLabel}>Average completion</span>
          <span className={styles.statFoot}>Weighted by enrolment</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, ready && stats.broken > 0 && styles.statDanger)}>{ready ? stats.broken : '—'}</span>
          <span className={styles.statLabel}>Live paths with problems</span>
          <span className={styles.statFoot}>{loaded ? `${stats.drafts} draft${stats.drafts === 1 ? '' : 's'} in progress` : ' '}</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Path status">
            {TABS.map((item) => (
              <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className={cx(styles.segment, tab === item.value && styles.segmentActive)} onClick={() => setTab(item.value)}>
                {item.label}
                <span className={styles.segmentCount}>{counts[item.value]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={cx(styles.toolbar, styles.toolbarThree)}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search paths" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search paths" />
          </div>
          <select className={styles.select} value={level} onChange={(event) => setLevel(event.target.value)} aria-label="Filter by level">
            <option value="">All levels</option>
            {Object.entries(LEVEL_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={tier} onChange={(event) => setTier(event.target.value)} aria-label="Filter by access">
            <option value="">All access tiers</option>
            {TIERS.map((value) => (
              <option key={value} value={value}>
                {TIER_META[value].label}
              </option>
            ))}
          </select>
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No learning paths match the current filters.</div>
        ) : (
          <div className={styles.pathGrid}>
            {rows.map((path) => {
              const st = STATUS_META[path.status];
              const lv = LEVEL_META[path.level];
              const problems = issues.get(path.id) ?? [];
              return (
                <button key={path.id} type="button" className={cx(styles.pathCard, path.status === 'archived' && styles.pathDim)} onClick={() => setOpenId(path.id)}>
                  <span className={styles.pathTop}>
                    <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
                    {path.certificate && (
                      <span className={styles.certificate} title="Awards a certificate">
                        <Award width={15} height={15} aria-hidden="true" />
                        Certificate
                      </span>
                    )}
                  </span>
                  <span className={styles.pathTitle}>{path.title}</span>
                  <span className={styles.pathSummary}>{path.summary || 'No summary yet'}</span>
                  <span className={styles.pathBadges}>
                    <span className={cx(styles.badge, styles[`tone_${lv.tone}`])}>{lv.label}</span>
                    <span className={cx(styles.badge, styles[`tone_${TIER_META[path.tier].tone}`])}>{TIER_META[path.tier].label}</span>
                  </span>
                  <span className={styles.pathMeta}>{`${path.steps.length} step${path.steps.length === 1 ? '' : 's'} · ${ready ? formatMinutes(pathMinutes(path.steps, catalogMap)) : '…'}`}</span>
                  {path.status === 'published' || path.enrolled > 0 ? (
                    <span className={styles.pathStats}>
                      <span>{`${formatCount(path.enrolled)} enrolled`}</span>
                      <span className={styles.meterCell}>
                        <span className={styles.meter} aria-hidden="true">
                          <span className={styles.meterFill} style={{ width: `${path.completion}%` }} />
                        </span>
                        {`${path.completion}%`}
                      </span>
                    </span>
                  ) : (
                    <span className={styles.pathStats}>
                      <span className={styles.muted}>Not published yet</span>
                    </span>
                  )}
                  {problems.length > 0 && (
                    <span className={styles.pathIssue}>
                      <TriangleAlert width={14} height={14} aria-hidden="true" />
                      {`${problems.length} issue${problems.length === 1 ? '' : 's'} to fix before publishing`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {open && ready && (
        <PathEditor
          key={open.id}
          path={open}
          catalog={catalog.items}
          store={store}
          onNotice={setNotice}
          onOpen={(id) => setOpenId(id)}
          onClose={() => setOpenId(null)}
        />
      )}
      {creating && (
        <NewPathModal
          existingTitles={new Set(paths.map((path) => path.title.toLowerCase()))}
          onCancel={() => setCreating(false)}
          onSubmit={async (input) => {
            const id = await store.create(input);
            setCreating(false);
            if (!id) return;
            setTab('all');
            setOpenId(id);
          }}
        />
      )}
    </div>
  );
}
