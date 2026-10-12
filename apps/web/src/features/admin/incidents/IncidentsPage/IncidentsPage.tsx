'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Plus, RotateCcw, Search } from 'lucide-react';
import { useIncidents } from '../lib/api';
import { COMPONENTS, HEALTH_META, SEVERITY_META, STATUS_META, componentHealth, cx, formatAgo, formatSpan, initials } from '../lib/shared';
import type { Incident } from '../lib/types';
import { DeclareModal } from '../DeclareModal/DeclareModal';
import { IncidentDrawer } from '../IncidentDrawer/IncidentDrawer';
import styles from '../ui/incidents.module.css';

type Tab = 'active' | 'resolved' | 'all';

const TABS: { value: Tab; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

const DAY = 86_400_000;
const inTab = (incident: Incident, tab: Tab) => (tab === 'all' ? true : tab === 'active' ? incident.status !== 'resolved' : incident.status === 'resolved');

export default function IncidentsPage() {
  const store = useIncidents();
  const { items, loaded, refresh, error, clearError } = store;
  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('');
  const [component, setComponent] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [declaring, setDeclaring] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const health = useMemo(() => componentHealth(items), [items]);

  const stats = useMemo(() => {
    const active = items.filter((incident) => incident.status !== 'resolved');
    const recent = items.filter((incident) => now && incident.startedAt >= now - 30 * DAY);
    const resolved = recent.filter((incident) => incident.resolvedAt);
    const worst = active.reduce<Incident | null>((best, incident) => (!best || SEVERITY_META[incident.severity].rank < SEVERITY_META[best.severity].rank ? incident : best), null);
    return {
      active: active.length,
      worst: worst ? SEVERITY_META[worst.severity].label : null,
      affected: Object.values(health).filter((value) => value !== 'operational').length,
      mttr: resolved.length ? resolved.reduce((sum, incident) => sum + (incident.resolvedAt! - incident.startedAt), 0) / resolved.length : 0,
      resolvedCount: resolved.length,
      month: recent.length,
      missingPm: items.filter((incident) => incident.status === 'resolved' && incident.severity !== 'sev3' && !incident.postmortem).length,
    };
  }, [items, health, now]);

  const counts = useMemo(() => Object.fromEntries(TABS.map((item) => [item.value, items.filter((incident) => inTab(incident, item.value)).length])) as Record<Tab, number>, [items]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((incident) => {
        if (!inTab(incident, tab)) return false;
        if (severity && incident.severity !== severity) return false;
        if (component && !incident.components.includes(component as Incident['components'][number])) return false;
        if (q && !`${incident.id} ${incident.title} ${incident.commander}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const activeA = a.status !== 'resolved';
        const activeB = b.status !== 'resolved';
        if (activeA !== activeB) return activeA ? -1 : 1;
        if (activeA) return SEVERITY_META[a.severity].rank - SEVERITY_META[b.severity].rank || b.startedAt - a.startedAt;
        return b.startedAt - a.startedAt;
      });
  }, [items, tab, query, severity, component]);

  const open = openId ? items.find((incident) => incident.id === openId) ?? null : null;
  const label = (id: string) => COMPONENTS.find((item) => item.id === id)?.label ?? id;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Incident Management</h1>
          <p className={styles.subtitle}>Declare, coordinate and review platform incidents</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={cx(styles.primaryButton, styles.dangerButton)} onClick={() => setDeclaring(true)} disabled={!loaded}>
            <Plus width={16} height={16} aria-hidden="true" />
            Declare incident
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

      <section className={cx(styles.card, styles.statusBoard)} aria-label="Component status">
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Component status</h2>
          <span className={cx(styles.overall, stats.affected ? styles.overallBad : styles.overallGood)}>
            {loaded ? (stats.affected ? `${stats.affected} component${stats.affected === 1 ? '' : 's'} affected` : 'All systems operational') : ' '}
          </span>
        </div>
        <ul className={styles.components}>
          {COMPONENTS.map((item) => {
            const meta = HEALTH_META[health[item.id]];
            return (
              <li key={item.id} className={styles.component}>
                <span className={styles.componentName}>{item.label}</span>
                <span className={cx(styles.health, styles[`text_${meta.tone}`])}>
                  <span className={cx(styles.healthDot, styles[`dot_${meta.tone}`])} aria-hidden="true" />
                  {loaded ? meta.label : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats.active > 0 && styles.statDanger)}>{loaded ? stats.active : '—'}</span>
          <span className={styles.statLabel}>Active incidents</span>
          <span className={styles.statFoot}>{loaded ? (stats.worst ? `Highest severity ${stats.worst}` : 'Nothing ongoing') : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded && now && stats.resolvedCount ? formatSpan(stats.mttr) : '—'}</span>
          <span className={styles.statLabel}>Mean time to resolve</span>
          <span className={styles.statFoot}>{loaded ? `${stats.resolvedCount} resolved in 30 days` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded && now ? stats.month : '—'}</span>
          <span className={styles.statLabel}>Incidents in 30 days</span>
          <span className={styles.statFoot}>Declared, any severity</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats.missingPm > 0 && styles.statWarn)}>{loaded ? stats.missingPm : '—'}</span>
          <span className={styles.statLabel}>Postmortems due</span>
          <span className={styles.statFoot}>Resolved SEV1 / SEV2 without one</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Incident status">
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

        <div className={cx(styles.toolbar, styles.toolbar3)}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search by ID, title or commander" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search incidents" />
          </div>
          <select className={styles.select} value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Filter by severity">
            <option value="">All severities</option>
            {Object.entries(SEVERITY_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={component} onChange={(event) => setComponent(event.target.value)} aria-label="Filter by component">
            <option value="">All components</option>
            {COMPONENTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {loaded && rows.length > 0 && <p className={styles.count}>{`${rows.length} incident${rows.length === 1 ? '' : 's'}`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{tab === 'active' && !query && !severity && !component ? 'No active incidents. All systems operational.' : 'No incidents match the current filters.'}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Components</th>
                  <th>Commander</th>
                  <th>Duration</th>
                  <th className={styles.actionsHead}>
                    <span className={styles.srOnly}>Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((incident) => {
                  const sev = SEVERITY_META[incident.severity];
                  const status = STATUS_META[incident.status];
                  const resolved = incident.status === 'resolved';
                  return (
                    <tr key={incident.id} className={styles.clickRow} onClick={() => setOpenId(incident.id)}>
                      <td className={styles.reportCell}>
                        <button
                          type="button"
                          className={styles.rowLink}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenId(incident.id);
                          }}
                        >
                          {incident.title}
                        </button>
                        <span className={styles.meta}>{`${incident.id} · started ${now ? formatAgo(incident.startedAt, now) : ''}`}</span>
                      </td>
                      <td>
                        <span className={cx(styles.sevBadge, styles[`tone_${sev.tone}`])}>{sev.label}</span>
                      </td>
                      <td>
                        <span className={cx(styles.badge, styles[`tone_${status.tone}`])}>{status.label}</span>
                      </td>
                      <td>
                        <span className={styles.tagList}>
                          {incident.components.slice(0, 2).map((id) => (
                            <span key={id} className={styles.tag}>
                              {label(id)}
                            </span>
                          ))}
                          {incident.components.length > 2 && <span className={styles.tag}>{`+${incident.components.length - 2}`}</span>}
                        </span>
                      </td>
                      <td>
                        <span className={styles.assignee}>
                          <span className={styles.avatar} aria-hidden="true">
                            {initials(incident.commander)}
                          </span>
                          {incident.commander}
                        </span>
                      </td>
                      <td className={styles.nowrap}>
                        {now ? (resolved ? `Lasted ${formatSpan((incident.resolvedAt ?? now) - incident.startedAt)}` : <span className={styles.running}>{`Running ${formatSpan(now - incident.startedAt)}`}</span>) : ''}
                        {resolved && (
                          <span className={cx(styles.meta, !incident.postmortem && incident.severity !== 'sev3' && styles.metaWarn)}>
                            {incident.postmortem ? 'Postmortem published' : incident.severity === 'sev3' ? 'No postmortem needed' : 'Postmortem due'}
                          </span>
                        )}
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

      {open && <IncidentDrawer key={open.id} incident={open} now={now || Date.now()} store={store} onClose={() => setOpenId(null)} />}
      {declaring && (
        <DeclareModal
          responders={store.responders}
          onCancel={() => setDeclaring(false)}
          onSubmit={async (input) => {
            const id = await store.declare(input);
            setDeclaring(false);
            if (!id) return;
            setTab('active');
            setOpenId(id);
          }}
        />
      )}
    </div>
  );
}