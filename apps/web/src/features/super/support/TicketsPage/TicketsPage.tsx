'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, RotateCcw, Search } from 'lucide-react';
import { useTickets } from '../lib/api';
import { CATEGORY_META, PRIORITY_META, STATUS_META, cx, formatAgo, formatSpan, initials, slaOf } from '../lib/shared';
import type { Ticket, TicketStatus } from '../lib/types';
import { TicketDrawer } from '../TicketDrawer/TicketDrawer';
import styles from '../ui/support.module.css';

type Tab = 'unresolved' | TicketStatus | 'all';

const TABS: { value: Tab; label: string }[] = [
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'new', label: 'New' },
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'all', label: 'All' },
];

const inTab = (ticket: Ticket, tab: Tab) => (tab === 'all' ? true : tab === 'unresolved' ? ticket.status !== 'resolved' : ticket.status === tab);

export default function TicketsPage() {
  const store = useTickets();
  const { items, loaded, refresh, error, clearError } = store;
  const [tab, setTab] = useState<Tab>('unresolved');
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('sla');
  const [openId, setOpenId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const counts = useMemo(() => {
    const out = {} as Record<Tab, number>;
    for (const item of TABS) out[item.value] = items.filter((ticket) => inTab(ticket, item.value)).length;
    return out;
  }, [items]);

  const stats = useMemo(() => {
    const unresolved = items.filter((ticket) => ticket.status !== 'resolved');
    const responded = items.filter((ticket) => ticket.firstResponseAt);
    const rated = items.filter((ticket) => ticket.rating !== null);
    return {
      unresolved: unresolved.length,
      fresh: unresolved.filter((ticket) => ticket.status === 'new').length,
      breached: now ? unresolved.filter((ticket) => slaOf(ticket, now).breached).length : 0,
      avgResponse: responded.length ? responded.reduce((sum, ticket) => sum + (ticket.firstResponseAt! - ticket.createdAt), 0) / responded.length : 0,
      responded: responded.length,
      csat: rated.length ? rated.filter((ticket) => (ticket.rating ?? 0) >= 4).length / rated.length : 0,
      rated: rated.length,
    };
  }, [items, now]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((ticket) => {
      if (!inTab(ticket, tab)) return false;
      if (priority && ticket.priority !== priority) return false;
      if (category && ticket.category !== category) return false;
      if (q && !`${ticket.id} ${ticket.subject} ${ticket.requester.name} ${ticket.requester.org}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const due = (ticket: Ticket) =>
      ticket.firstResponseAt || ticket.status === 'resolved' ? Number.MAX_SAFE_INTEGER : ticket.createdAt + PRIORITY_META[ticket.priority].slaMin * 60_000;
    return list.sort((a, b) => {
      if (sort === 'newest') return b.updatedAt - a.updatedAt;
      if (sort === 'priority') return PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank || b.updatedAt - a.updatedAt;
      return due(a) - due(b) || PRIORITY_META[a.priority].rank - PRIORITY_META[b.priority].rank || b.updatedAt - a.updatedAt;
    });
  }, [items, tab, query, priority, category, sort]);

  const open = openId ? items.find((ticket) => ticket.id === openId) ?? null : null;
  const { focus } = store;
  useEffect(() => focus(openId), [focus, openId]);
  const showStatus = tab === 'unresolved' || tab === 'all';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Customer Support</h1>
          <p className={styles.subtitle}>Billing, plan, account and certificate questions from learners and institutions</p>
        </div>
        <div className={styles.headerActions}>
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

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded ? stats.unresolved : '—'}</span>
          <span className={styles.statLabel}>Unresolved tickets</span>
          <span className={styles.statFoot}>{loaded ? `${stats.fresh} waiting for a first reply` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats.breached > 0 && styles.statDanger)}>{loaded && now ? stats.breached : '—'}</span>
          <span className={styles.statLabel}>SLA breached</span>
          <span className={styles.statFoot}>First reply later than the target</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{loaded && stats.responded ? formatSpan(stats.avgResponse) : '—'}</span>
          <span className={styles.statLabel}>Avg first response</span>
          <span className={styles.statFoot}>{loaded ? `Across ${stats.responded} tickets` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statSuccess)}>{loaded && stats.rated ? `${Math.round(stats.csat * 100)}%` : '—'}</span>
          <span className={styles.statLabel}>Satisfaction</span>
          <span className={styles.statFoot}>{loaded ? `Rated 4 or 5 stars · ${stats.rated} ratings` : ' '}</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Ticket status">
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
              placeholder="Search by ID, subject, requester or institution"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search tickets"
            />
          </div>
          <select className={styles.select} value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {Object.entries(PRIORITY_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {Object.entries(CATEGORY_META).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort tickets">
            <option value="sla">Sort by SLA due</option>
            <option value="priority">Sort by priority</option>
            <option value="newest">Recently updated</option>
          </select>
        </div>

        {loaded && rows.length > 0 && <p className={styles.count}>{`${rows.length} ticket${rows.length === 1 ? '' : 's'}`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{tab === 'unresolved' && !query && !priority && !category ? 'Inbox zero — no unresolved tickets.' : 'No tickets match the current filters.'}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Requester</th>
                  <th>Priority</th>
                  {showStatus && <th>Status</th>}
                  <th>First response</th>
                  <th>Assignee</th>
                  <th className={styles.actionsHead}>
                    <span className={styles.srOnly}>Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((ticket) => {
                  const pr = PRIORITY_META[ticket.priority];
                  const status = STATUS_META[ticket.status];
                  const sla = now ? slaOf(ticket, now) : null;
                  return (
                    <tr key={ticket.id} className={styles.clickRow} onClick={() => setOpenId(ticket.id)}>
                      <td className={styles.reportCell}>
                        <button
                          type="button"
                          className={styles.rowLink}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenId(ticket.id);
                          }}
                        >
                          {ticket.subject}
                        </button>
                        <span className={styles.meta}>{`${ticket.id} · ${CATEGORY_META[ticket.category]}${now ? ` · updated ${formatAgo(ticket.updatedAt, now)}` : ''}`}</span>
                      </td>
                      <td className={styles.personCell}>
                        <span className={styles.personName}>{ticket.requester.name}</span>
                        <span className={styles.meta}>{ticket.requester.org}</span>
                        <span className={styles.meta}>{ticket.requester.role}</span>
                      </td>
                      <td>
                        <span className={cx(styles.badge, styles[`tone_${pr.tone}`])}>{pr.label}</span>
                      </td>
                      {showStatus && (
                        <td>
                          <span className={cx(styles.badge, styles[`tone_${status.tone}`])}>{status.label}</span>
                        </td>
                      )}
                      <td className={cx(styles.nowrap, sla && styles[`text_${sla.tone}`])}>{sla?.label ?? ''}</td>
                      <td>
                        {ticket.assignee ? (
                          <span className={styles.assignee}>
                            <span className={styles.avatar} aria-hidden="true">
                              {initials(ticket.assignee)}
                            </span>
                            {ticket.assignee}
                          </span>
                        ) : (
                          <span className={styles.unassigned}>Unassigned</span>
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

      {open && <TicketDrawer key={open.id} ticket={open} now={now || Date.now()} store={store} onClose={() => setOpenId(null)} />}
    </div>
  );
}
