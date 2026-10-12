'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronRight, MessageSquareWarning, RotateCcw, Search, Star } from 'lucide-react';
import { usePaths } from '../../paths/lib/api';
import { useCatalog } from '../lib/api';
import { DIFFICULTY_META, MAX_FEATURED, TECHNOLOGIES, TIERS, TIER_META, TYPE_META, VISIBILITY_META, cx, formatCount, needsAttention } from '../lib/shared';
import type { AccessTier, ContentItem, ContentType } from '../lib/types';
import { ContentDrawer } from '../ContentDrawer/ContentDrawer';
import { OwnershipPanel } from '../OwnershipPanel/OwnershipPanel';
import styles from '../ui/catalog.module.css';

type Tab = 'all' | ContentType | 'attention';
type Sort = 'learners' | 'rating' | 'completion' | 'newest';

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All content' },
  { value: 'problem', label: 'Problems' },
  { value: 'project', label: 'Projects' },
  { value: 'lab', label: 'Labs' },
  { value: 'attention', label: 'Needs attention' },
];

const PAGE = 25;

export default function CatalogPage() {
  const store = useCatalog();
  const paths = usePaths();
  const { items, loaded, refresh, error, clearError } = store;
  const [tab, setTab] = useState<Tab>('all');
  const [view, setView] = useState<'catalog' | 'ownership'>('catalog');
  const [query, setQuery] = useState('');
  const [technology, setTechnology] = useState('');
  const [tier, setTier] = useState('');
  const [visibility, setVisibility] = useState('');
  const [sort, setSort] = useState<Sort>('learners');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState<'tier' | 'hide' | null>(null);
  const [bulkTier, setBulkTier] = useState<AccessTier>('starter');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const stats = useMemo(() => {
    const live = items.filter((item) => item.visibility !== 'retired');
    const listed = items.filter((item) => item.visibility === 'listed');
    const free = listed.filter((item) => item.tier === 'free').length;
    const learners = listed.reduce((sum, item) => sum + item.learners, 0);
    const weighted = listed.reduce((sum, item) => sum + item.completion * item.learners, 0);
    return {
      live: live.length,
      listed: listed.length,
      hidden: items.filter((item) => item.visibility === 'hidden').length,
      freePct: listed.length ? Math.round((free / listed.length) * 100) : 0,
      paid: listed.length - free,
      completion: learners ? Math.round(weighted / learners) : 0,
      attention: items.filter(needsAttention).length,
      featured: items.filter((item) => item.featured).length,
    };
  }, [items]);

  const counts = useMemo(() => {
    const map: Record<Tab, number> = { all: items.length, problem: 0, project: 0, lab: 0, attention: 0 };
    for (const item of items) {
      map[item.type] += 1;
      if (needsAttention(item)) map.attention += 1;
    }
    return map;
  }, [items]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (tab === 'attention' ? !needsAttention(item) : tab !== 'all' && item.type !== tab) return false;
      if (technology && item.technology !== technology) return false;
      if (tier && item.tier !== tier) return false;
      if (visibility && item.visibility !== visibility) return false;
      if (q && !`${item.title} ${item.id} ${item.technology}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const sorted = [...filtered];
    if (sort === 'learners') sorted.sort((a, b) => b.learners - a.learners);
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating || b.ratings - a.ratings);
    if (sort === 'completion') sorted.sort((a, b) => a.completion - b.completion);
    if (sort === 'newest') sorted.sort((a, b) => b.publishedAt - a.publishedAt);
    return sorted;
  }, [items, tab, query, technology, tier, visibility, sort]);

  const visible = rows.slice(0, limit);
  const allVisibleSelected = visible.length > 0 && visible.every((item) => selected.has(item.id));
  const open = openId ? items.find((item) => item.id === openId) ?? null : null;
  const { focus } = store;
  useEffect(() => focus(openId), [focus, openId]);

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
      if (allVisibleSelected) visible.forEach((item) => next.delete(item.id));
      else visible.forEach((item) => next.add(item.id));
      return next;
    });

  const clearSelection = () => {
    setSelected(new Set());
    setBulkMode(null);
    setBulkReason('');
    setBulkError('');
  };

  const submitBulk = (event: FormEvent) => {
    event.preventDefault();
    const ids = [...selected];
    if (bulkMode === 'tier') {
      store.setTier(ids, bulkTier);
      setNotice(`Moved ${ids.length} item${ids.length === 1 ? '' : 's'} to ${TIER_META[bulkTier].label}`);
    } else if (bulkMode === 'hide') {
      if (bulkReason.trim().length < 5) {
        setBulkError('Give a reason of at least 5 characters');
        return;
      }
      store.setVisibility(ids, 'hidden', bulkReason.trim());
      setNotice(`Hid ${ids.length} item${ids.length === 1 ? '' : 's'} from the catalog`);
    }
    clearSelection();
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Content Catalog</h1>
          <p className={styles.subtitle}>What learners can see, and which plan unlocks it</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.segmented} role="tablist" aria-label="Catalog view">
            <button type="button" role="tab" aria-selected={view === 'catalog'} className={cx(styles.segment, view === 'catalog' && styles.segmentActive)} onClick={() => setView('catalog')}>
              Live catalog
            </button>
            <button type="button" role="tab" aria-selected={view === 'ownership'} className={cx(styles.segment, view === 'ownership' && styles.segmentActive)} onClick={() => setView('ownership')}>
              Ownership
            </button>
          </div>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
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

      {view === 'ownership' ? (
        <OwnershipPanel />
      ) : (
      <>
      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? stats.live : '—'}</span>
          <span className={styles.statLabel}>Live items</span>
          <span className={styles.statFoot}>{loaded ? `${stats.listed} listed · ${stats.hidden} hidden` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? `${stats.freePct}%` : '—'}</span>
          <span className={styles.statLabel}>Free to everyone</span>
          <span className={styles.statFoot}>{loaded ? `${stats.paid} listed items need a paid plan` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statSuccess)}>{loaded ? `${stats.completion}%` : '—'}</span>
          <span className={styles.statLabel}>Average completion</span>
          <span className={styles.statFoot}>Weighted by learners</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, loaded && stats.attention > 0 && styles.statDanger)}>{loaded ? stats.attention : '—'}</span>
          <span className={styles.statLabel}>Needs attention</span>
          <span className={styles.statFoot}>Rated under 3.6 or under 20% completion</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Content type">
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
                <span className={styles.segmentCount}>{counts[item.value]}</span>
              </button>
            ))}
          </div>
          <span className={styles.featuredCount}>
            <Star width={14} height={14} aria-hidden="true" />
            {`${loaded ? stats.featured : 0} of ${MAX_FEATURED} featured`}
          </span>
        </div>

        <div className={cx(styles.toolbar, styles.toolbarFive)}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search by title, ID or technology" value={query} onChange={(event) => filter(setQuery)(event.target.value)} aria-label="Search content" />
          </div>
          <select className={styles.select} value={technology} onChange={(event) => filter(setTechnology)(event.target.value)} aria-label="Filter by technology">
            <option value="">All technologies</option>
            {TECHNOLOGIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={tier} onChange={(event) => filter(setTier)(event.target.value)} aria-label="Filter by access">
            <option value="">All access tiers</option>
            {TIERS.map((value) => (
              <option key={value} value={value}>
                {TIER_META[value].label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={visibility} onChange={(event) => filter(setVisibility)(event.target.value)} aria-label="Filter by visibility">
            <option value="">Any visibility</option>
            {Object.entries(VISIBILITY_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={sort} onChange={(event) => filter(setSort)(event.target.value as Sort)} aria-label="Sort">
            <option value="learners">Most learners</option>
            <option value="rating">Highest rated</option>
            <option value="completion">Lowest completion</option>
            <option value="newest">Newest</option>
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
            {bulkMode === null ? (
              <div className={styles.bulkActions}>
                <button type="button" className={styles.bulkButton} onClick={() => setBulkMode('tier')}>
                  Change access
                </button>
                <button type="button" className={cx(styles.bulkButton, styles.bulkDanger)} onClick={() => setBulkMode('hide')}>
                  Hide
                </button>
                <button
                  type="button"
                  className={cx(styles.bulkButton, styles.bulkSuccess)}
                  onClick={() => {
                    const ids = items.filter((item) => selected.has(item.id) && item.visibility === 'hidden').map((item) => item.id);
                    store.setVisibility(ids, 'listed', null);
                    setNotice(ids.length ? `Listed ${ids.length} item${ids.length === 1 ? '' : 's'} again` : 'None of the selected items were hidden');
                    clearSelection();
                  }}
                >
                  List again
                </button>
                <button type="button" className={styles.bulkLink} onClick={clearSelection}>
                  Clear
                </button>
              </div>
            ) : (
              <form className={styles.bulkForm} onSubmit={submitBulk} noValidate>
                {bulkMode === 'tier' ? (
                  <select className={styles.select} value={bulkTier} onChange={(event) => setBulkTier(event.target.value as AccessTier)} aria-label="New access tier" autoFocus>
                    {TIERS.map((value) => (
                      <option key={value} value={value}>
                        {TIER_META[value].label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={cx(styles.input, bulkError && styles.inputError)}
                    placeholder="Reason for hiding"
                    value={bulkReason}
                    autoFocus
                    onChange={(event) => {
                      setBulkReason(event.target.value);
                      setBulkError('');
                    }}
                    aria-label="Reason for hiding"
                    aria-invalid={bulkError ? true : undefined}
                  />
                )}
                <button type="submit" className={cx(styles.bulkButton, bulkMode === 'hide' && styles.bulkDanger)}>
                  {bulkMode === 'tier' ? 'Apply' : 'Hide'}
                </button>
                <button type="button" className={styles.bulkLink} onClick={() => setBulkMode(null)}>
                  Cancel
                </button>
                {bulkError && <span className={styles.bulkError}>{bulkError}</span>}
              </form>
            )}
          </div>
        )}

        {loaded && rows.length > 0 && <p className={styles.count}>{`Showing ${visible.length} of ${rows.length} items`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No content matches the current filters.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={cx(styles.table, styles.catalogTable)}>
                <thead>
                  <tr>
                    <th className={styles.checkCell}>
                      <input type="checkbox" className={styles.checkbox} checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all shown items" />
                    </th>
                    <th>Content</th>
                    <th>Access</th>
                    <th className={styles.numHead}>Learners</th>
                    <th>Completion</th>
                    <th>Rating</th>
                    <th>Visibility</th>
                    <th className={styles.actionsHead}>
                      <span className={styles.srOnly}>Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item: ContentItem) => {
                    const isSelected = selected.has(item.id);
                    const vis = VISIBILITY_META[item.visibility];
                    const diff = DIFFICULTY_META[item.difficulty];
                    return (
                      <tr key={item.id} className={cx(styles.clickRow, isSelected && styles.rowSelected, item.visibility === 'retired' && styles.rowDim)} onClick={() => setOpenId(item.id)}>
                        <td className={styles.checkCell} onClick={(event) => event.stopPropagation()}>
                          <input type="checkbox" className={styles.checkbox} checked={isSelected} onChange={() => toggle(item.id)} aria-label={`Select ${item.title}`} />
                        </td>
                        <td className={styles.contentCell}>
                          <span className={styles.nameLine}>
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
                            {item.featured && <Star className={styles.featuredStar} width={14} height={14} aria-label="Featured" />}
                            {item.openReports > 0 && (
                              <span className={styles.reportFlag} title={`${item.openReports} open report${item.openReports === 1 ? '' : 's'}`}>
                                <MessageSquareWarning width={14} height={14} aria-hidden="true" />
                                {item.openReports}
                              </span>
                            )}
                          </span>
                          <span className={styles.meta}>
                            {`${TYPE_META[item.type].label} · ${item.technology} · `}
                            <span className={styles[`text_${diff.tone}`]}>{diff.label}</span>
                          </span>
                        </td>
                        <td>
                          <span className={cx(styles.badge, styles[`tone_${TIER_META[item.tier].tone}`])}>{TIER_META[item.tier].label}</span>
                        </td>
                        <td className={styles.numCell}>{formatCount(item.learners)}</td>
                        <td>
                          <span className={styles.meterCell}>
                            <span className={styles.meter} aria-hidden="true">
                              <span className={cx(styles.meterFill, item.completion < 20 && styles.meterLow)} style={{ width: `${item.completion}%` }} />
                            </span>
                            {`${item.completion}%`}
                          </span>
                        </td>
                        <td className={styles.nowrap}>
                          {item.ratings ? (
                            <>
                              <span className={cx(styles.rating, item.rating < 3.6 && styles.ratingLow)}>
                                <Star width={13} height={13} aria-hidden="true" />
                                {item.rating.toFixed(1)}
                              </span>
                              <span className={styles.muted}>{` (${formatCount(item.ratings)})`}</span>
                            </>
                          ) : (
                            <span className={styles.muted}>No ratings</span>
                          )}
                        </td>
                        <td>
                          <span className={cx(styles.badge, styles[`tone_${vis.tone}`])}>{vis.label}</span>
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
      </>
      )}

      {open && <ContentDrawer key={open.id} item={open} store={store} usedIn={paths.paths.filter((path) => path.steps.includes(open.id) && path.status !== 'archived')} onClose={() => setOpenId(null)} />}
    </div>
  );
}
