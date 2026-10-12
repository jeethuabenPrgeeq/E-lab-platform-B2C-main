'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, Search, ShieldAlert } from 'lucide-react';
import { errorText } from '../../lib/api';
import { fetchAuditEvents } from '../lib/api';
import { CATEGORY_META, RANGES, cx, formatAgo, formatDateTime, toCsv, type RangeValue } from '../lib/shared';
import type { AuditEvent } from '../lib/types';
import { AuditDrawer } from '../AuditDrawer/AuditDrawer';
import styles from '../ui/audit.module.css';

const PAGE = 50;

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [now, setNow] = useState(0);
  const [range, setRange] = useState<RangeValue>('7d');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [actor, setActor] = useState('');
  const [result, setResult] = useState('');
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setNow(Date.now());
    fetchAuditEvents()
      .then((items) => {
        setEvents(items);
        setError('');
      })
      .catch((err) => {
        setError(errorText(err));
        setEvents((current) => current ?? []);
      });
  };

  useEffect(load, []);

  const loaded = events !== null;
  const span = RANGES.find((item) => item.value === range)!.ms;
  const inRange = useMemo(() => (events ?? []).filter((event) => event.at >= now - span), [events, now, span]);
  const actors = useMemo(() => [...new Set((events ?? []).map((event) => event.actor.name))].sort(), [events]);

  const stats = useMemo(
    () => ({
      total: inRange.length,
      failed: inRange.filter((event) => event.result === 'failure').length,
      actors: new Set(inRange.filter((event) => event.actor.role !== 'System' && event.result === 'success').map((event) => event.actor.name)).size,
      sensitive: inRange.filter((event) => event.sensitive).length,
      failedLogins: inRange.filter((event) => event.action === 'auth.login_failed').length,
    }),
    [inRange],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inRange.filter((event) => {
      if (category && event.category !== category) return false;
      if (actor && event.actor.name !== actor) return false;
      if (result && event.result !== result) return false;
      if (sensitiveOnly && !event.sensitive) return false;
      if (q && !`${event.id} ${event.action} ${event.summary} ${event.target.label} ${event.ip} ${event.requestId}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [inRange, query, category, actor, result, sensitiveOnly]);

  const visible = rows.slice(0, limit);
  const filtered = Boolean(query || category || actor || result || sensitiveOnly);
  const open = openId ? (events ?? []).find((event) => event.id === openId) ?? null : null;

  const setter = <T,>(fn: (value: T) => void) => (value: T) => {
    fn(value);
    setLimit(PAGE);
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `elab-audit-${range}-${new Date(now).toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Technical Audit Logs</h1>
          <p className={styles.subtitle}>Every admin action on content, runtimes, the judge, support and releases — read only</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={exportCsv} disabled={!loaded || rows.length === 0}>
            <Download width={16} height={16} aria-hidden="true" />
            {`Export CSV${loaded ? ` (${rows.length})` : ''}`}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" className={styles.errorDismiss} onClick={() => setError('')} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <div className={styles.filterRow}>
        <div className={styles.segmented} role="radiogroup" aria-label="Time range">
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={range === item.value}
              className={cx(styles.segment, range === item.value && styles.segmentActive)}
              onClick={() => setter(setRange)(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? stats.total.toLocaleString('en-IN') : '—'}</span>
          <span className={styles.statLabel}>Events</span>
          <span className={styles.statFoot}>{`In the last ${RANGES.find((item) => item.value === range)!.label}`}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats.failed > 0 && styles.statDanger)}>{loaded ? stats.failed : '—'}</span>
          <span className={styles.statLabel}>Failed actions</span>
          <span className={styles.statFoot}>{loaded ? `${stats.failedLogins} failed sign-ins` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? stats.actors : '—'}</span>
          <span className={styles.statLabel}>People making changes</span>
          <span className={styles.statFoot}>Admins with a successful action</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statWarn)}>{loaded ? stats.sensitive : '—'}</span>
          <span className={styles.statLabel}>Sensitive actions</span>
          <span className={styles.statFoot}>Limits, rejudges, deletes, roles, releases</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={cx(styles.toolbar, styles.toolbarAudit)}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input
              className={styles.input}
              placeholder="Search action, target, IP or request ID"
              value={query}
              onChange={(event) => setter(setQuery)(event.target.value)}
              aria-label="Search audit events"
            />
          </div>
          <select className={styles.select} value={category} onChange={(event) => setter(setCategory)(event.target.value)} aria-label="Filter by area">
            <option value="">All areas</option>
            {Object.entries(CATEGORY_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={actor} onChange={(event) => setter(setActor)(event.target.value)} aria-label="Filter by person">
            <option value="">Everyone</option>
            {actors.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={result} onChange={(event) => setter(setResult)(event.target.value)} aria-label="Filter by result">
            <option value="">Any result</option>
            <option value="success">Succeeded</option>
            <option value="failure">Failed</option>
          </select>
          <label className={styles.toggle}>
            <input type="checkbox" checked={sensitiveOnly} onChange={(event) => setter(setSensitiveOnly)(event.target.checked)} />
            Sensitive only
          </label>
        </div>

        {loaded && rows.length > 0 && <p className={styles.count}>{`Showing ${visible.length} of ${rows.length.toLocaleString('en-IN')} event${rows.length === 1 ? '' : 's'}${filtered ? ' matching filters' : ''}`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No events match the current filters.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Who</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Result</th>
                    <th className={styles.actionsHead}>
                      <span className={styles.srOnly}>Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((event) => {
                    const cat = CATEGORY_META[event.category];
                    return (
                      <tr key={event.id} className={styles.clickRow} onClick={() => setOpenId(event.id)}>
                        <td className={styles.nowrap}>
                          <span className={styles.timeMain}>{formatDateTime(event.at)}</span>
                          <span className={styles.meta}>{formatAgo(event.at, now)}</span>
                        </td>
                        <td className={styles.whoCell}>
                          <span className={styles.personName}>{event.actor.name}</span>
                          <span className={styles.meta}>{event.actor.role}</span>
                        </td>
                        <td className={styles.reportCell}>
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
                          <span className={styles.actionLine}>
                            <span className={cx(styles.catTag, styles[`tone_${cat.tone}`])}>{cat.label}</span>
                            <code className={styles.code}>{event.action}</code>
                            {event.sensitive && (
                              <span className={styles.sensitive} title="Sensitive action">
                                <ShieldAlert width={13} height={13} aria-hidden="true" />
                                Sensitive
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={styles.targetCell}>
                          <span>{event.target.label}</span>
                          <span className={styles.meta}>{event.target.type.replace('_', ' ')}</span>
                        </td>
                        <td>
                          <span className={cx(styles.badge, event.result === 'success' ? styles.tone_success : styles.tone_danger)}>{event.result === 'success' ? 'Succeeded' : 'Failed'}</span>
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

      {open && <AuditDrawer event={open} now={now} onClose={() => setOpenId(null)} />}
    </div>
  );
}