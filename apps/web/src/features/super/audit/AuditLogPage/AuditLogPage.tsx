'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, RotateCcw, Search } from 'lucide-react';
import { useAuditLog } from '../lib/api';
import { CATEGORIES, CATEGORY_META, RANGE_META, SEVERITY_META, cx, formatAgo, formatDay, formatTime, toCsv, type Range } from '../lib/shared';
import type { AuditCategory, AuditEvent, AuditSeverity } from '../lib/types';
import { EventDrawer } from '../EventDrawer/EventDrawer';
import styles from '../ui/audit.module.css';

const PAGE_SIZE = 25;
const RANGES = Object.keys(RANGE_META) as Range[];
const DAY = 86_400_000;
const ADMIN_ROLES = new Set(['Super admin', 'Platform admin', 'Support agent']);

function dayLabel(t: number, now: number) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  if (t >= today) return 'Today';
  if (t >= today - DAY) return 'Yesterday';
  return new Date(t).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' });
}

function download(name: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogPage() {
  const { events, actorNames, loaded, refresh, error, clearError } = useAuditLog();
  const [now, setNow] = useState(0);
  const [range, setRange] = useState<Range>('7d');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AuditCategory | 'all'>('all');
  const [actor, setActor] = useState('all');
  const [severity, setSeverity] = useState<AuditSeverity | 'all'>('all');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('category');
    if (fromUrl && fromUrl in CATEGORY_META) {
      setCategory(fromUrl as AuditCategory);
      setRange('90d');
    }
    const q = params.get('q');
    if (q) setQuery(q);
  }, []);

  useEffect(() => {
    if (loaded) setNow(Date.now());
  }, [events, loaded]);

  const ready = loaded && now > 0;

  const stats = useMemo(() => {
    const day = events.filter((event) => event.at >= now - DAY);
    const failed = day.filter((event) => event.action === 'auth.sign_in_failed');
    const critical = events.filter((event) => event.severity === 'critical' && event.at >= now - 7 * DAY);
    const admins = Array.from(new Set(day.filter((event) => ADMIN_ROLES.has(event.actor.role)).map((event) => event.actor.name)));
    return {
      day: day.length,
      byAdmins: day.filter((event) => ADMIN_ROLES.has(event.actor.role)).length,
      automated: day.filter((event) => event.actor.role === 'System').length,
      failed: failed.length,
      failedIps: new Set(failed.map((event) => event.ip)).size,
      critical: critical.length,
      latestCritical: critical[0] ?? null,
      admins,
    };
  }, [events, now]);

  const inRange = useMemo(() => events.filter((event) => event.at >= now - RANGE_META[range].ms), [events, now, range]);

  const rangeCounts = useMemo(() => {
    const map = {} as Record<Range, number>;
    for (const key of RANGES) map[key] = events.filter((event) => event.at >= now - RANGE_META[key].ms).length;
    return map;
  }, [events, now]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inRange.filter((event) => {
      if (category !== 'all' && event.category !== category) return false;
      if (actor !== 'all' && (actor === 'Unknown' ? event.actor.role !== 'Unknown' : event.actor.name !== actor)) return false;
      if (severity !== 'all' && event.severity !== severity) return false;
      if (q && !`${event.id} ${event.summary} ${event.action} ${event.actor.name} ${event.actor.email} ${event.target.id} ${event.target.label} ${event.ip}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [inRange, query, category, actor, severity]);

  useEffect(() => setPage(0), [range, query, category, actor, severity]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const filtered = query.trim() !== '' || category !== 'all' || actor !== 'all' || severity !== 'all';

  const open = openId ? events.find((event) => event.id === openId) ?? null : null;

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setActor('all');
    setSeverity('all');
  };

  const showRelated = (event: AuditEvent) => {
    setOpenId(null);
    setQuery(event.target.id);
    setCategory('all');
    setActor('all');
    setSeverity('all');
    setRange('90d');
  };

  let lastDay = '';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit Logs</h1>
          <p className={styles.subtitle}>Every admin action and security event on eLab, newest first</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.primaryButton} disabled={!ready || rows.length === 0} onClick={() => download(`elab-audit-${range}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))}>
            <Download width={16} height={16} aria-hidden="true" />
            {`Export ${ready ? rows.length.toLocaleString('en-IN') : ''} events`}
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
          <span className={styles.statValue}>{ready ? stats.day : '—'}</span>
          <span className={styles.statLabel}>Events in the last 24 hours</span>
          <span className={styles.statFoot}>{ready ? `${stats.byAdmins} by admins · ${stats.automated} automated` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats.critical > 0 && styles.statDanger)}>{ready ? stats.critical : '—'}</span>
          <span className={styles.statLabel}>Critical events, 7 days</span>
          <span className={cx(styles.statFoot, styles.clampOne)}>{ready ? (stats.latestCritical ? `Latest: ${stats.latestCritical.summary}` : 'None this week') : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats.failed > 0 && styles.statWarn)}>{ready ? stats.failed : '—'}</span>
          <span className={styles.statLabel}>Failed sign-ins, 24 hours</span>
          <span className={styles.statFoot}>{ready ? `From ${stats.failedIps} IP address${stats.failedIps === 1 ? '' : 'es'}` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statSuccess)}>{ready ? stats.admins.length : '—'}</span>
          <span className={styles.statLabel}>Admins active today</span>
          <span className={cx(styles.statFoot, styles.clampOne)}>{ready ? stats.admins.join(', ') || 'Nobody yet' : ' '}</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Time range">
            {RANGES.map((key) => (
              <button key={key} type="button" role="tab" aria-selected={range === key} className={cx(styles.segment, range === key && styles.segmentActive)} onClick={() => setRange(key)}>
                {RANGE_META[key].label}
                <span className={styles.segmentCount}>{ready ? rangeCounts[key] : 0}</span>
              </button>
            ))}
          </div>
          <p className={styles.immutable}>Entries can’t be edited or deleted</p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search event, person, target, ID or IP" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search events" />
          </div>
          <select className={styles.select} value={category} onChange={(event) => setCategory(event.target.value as AuditCategory | 'all')} aria-label="Category">
            <option value="all">All categories</option>
            {CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {CATEGORY_META[key].label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={actor} onChange={(event) => setActor(event.target.value)} aria-label="Done by">
            <option value="all">Anyone</option>
            {actorNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="Unknown">Unknown (not signed in)</option>
          </select>
          <select className={styles.select} value={severity} onChange={(event) => setSeverity(event.target.value as AuditSeverity | 'all')} aria-label="Severity">
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="notice">Notice</option>
            <option value="info">Info</option>
          </select>
        </div>

        <div className={styles.countRow}>
          <p className={styles.count}>{ready ? `${rows.length.toLocaleString('en-IN')} event${rows.length === 1 ? '' : 's'}${rows.length > PAGE_SIZE ? ` · showing ${current * PAGE_SIZE + 1}–${Math.min(rows.length, (current + 1) * PAGE_SIZE)}` : ''}` : ' '}</p>
          {filtered && (
            <button type="button" className={styles.bulkLink} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {!ready ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{`No events match in the ${RANGE_META[range].label.toLowerCase()}.`}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={cx(styles.table, styles.auditTable)}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Done by</th>
                  <th>Event</th>
                  <th>Target</th>
                  <th>Severity</th>
                  <th className={styles.actionsHead}>
                    <span className={styles.srOnly}>Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((event) => {
                  const label = dayLabel(event.at, now);
                  const header = label !== lastDay;
                  lastDay = label;
                  const sev = SEVERITY_META[event.severity];
                  return (
                    <Fragment key={event.id}>
                      {header && (
                        <tr className={styles.groupRow}>
                          <th colSpan={6}>{label}</th>
                        </tr>
                      )}
                      <tr className={styles.clickRow} onClick={() => setOpenId(event.id)}>
                        <td className={styles.timeCell}>
                          <span className={styles.primaryText}>{formatTime(event.at)}</span>
                          <span className={styles.meta}>{now - event.at < DAY ? formatAgo(event.at, now) : formatDay(event.at)}</span>
                        </td>
                        <td className={styles.actorCell}>
                          <span className={cx(styles.primaryText, event.actor.role === 'Unknown' && styles.text_danger)}>{event.actor.name}</span>
                          <span className={styles.meta}>{event.actor.role === 'Unknown' ? event.ip : event.actor.role}</span>
                        </td>
                        <td className={styles.eventCell}>
                          <button
                            type="button"
                            className={styles.rowLink}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenId(event.id);
                            }}
                          >
                            {event.summary}
                          </button>
                          <span className={styles.meta}>
                            <span className={styles.mono}>{event.action}</span>
                            {` · ${CATEGORY_META[event.category].label}`}
                            {event.outcome === 'failure' && <span className={styles.text_danger}> · Failed</span>}
                          </span>
                        </td>
                        <td className={styles.targetCell}>
                          <span className={styles.primaryText}>{event.target.label}</span>
                          <span className={styles.meta}>{event.target.id === event.target.label ? event.target.type : `${event.target.type} · ${event.target.id}`}</span>
                        </td>
                        <td>
                          <span className={cx(styles.badge, styles[`tone_${sev.tone}`])}>{sev.label}</span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <span className={styles.iconButton} aria-hidden="true">
                              <ChevronRight width={16} height={16} />
                            </span>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {ready && pages > 1 && (
          <nav className={styles.pager} aria-label="Pages">
            <button type="button" className={styles.ghostButton} disabled={current === 0} onClick={() => setPage(current - 1)}>
              <ChevronLeft width={16} height={16} aria-hidden="true" />
              Newer
            </button>
            <span className={styles.pagerText}>{`Page ${current + 1} of ${pages}`}</span>
            <button type="button" className={styles.ghostButton} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
              Older
              <ChevronRight width={16} height={16} aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>

      {open && ready && <EventDrawer key={open.id} event={open} events={events} now={now} onOpen={setOpenId} onShowRelated={showRelated} onClose={() => setOpenId(null)} />}
    </div>
  );
}
