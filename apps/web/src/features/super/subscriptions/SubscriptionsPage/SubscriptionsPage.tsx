'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, RotateCcw, Search } from 'lucide-react';
import { useRevenue } from '../lib/api';
import { CYCLES, CYCLE_META, DAY, PLAN_META, STATUS_META, cx, formatCompactINR, formatDate, formatINR, isLive, monthlyValue } from '../lib/shared';
import type { Subscription } from '../lib/types';
import { PlansPanel } from '../PlansPanel/PlansPanel';
import { SubscriptionDrawer } from '../SubscriptionDrawer/SubscriptionDrawer';
import styles from '../ui/subscriptions.module.css';

type Tab = 'live' | 'past_due' | 'cancelling' | 'cancelled' | 'plans';

const TABS: { value: Tab; label: string }[] = [
  { value: 'live', label: 'Active' },
  { value: 'past_due', label: 'Past due' },
  { value: 'cancelling', label: 'Cancelling' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'plans', label: 'Plans & prices' },
];

const PAGE = 25;

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

function download(name: string, rows: Subscription[]) {
  const head = ['id', 'name', 'email', 'plan', 'cycle', 'amount', 'monthly_value', 'status', 'cancel_at_period_end', 'started', 'period_end'];
  const lines = rows.map((sub) =>
    [sub.id, sub.name, sub.email, PLAN_META[sub.plan].label, CYCLE_META[sub.cycle].label, String(sub.amount), monthlyValue(sub).toFixed(2), STATUS_META[sub.status].label, String(sub.cancelAtPeriodEnd), new Date(sub.startedAt).toISOString().slice(0, 10), new Date(sub.periodEnd).toISOString().slice(0, 10)].map(csvCell).join(','),
  );
  const url = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SubscriptionsPage() {
  const store = useRevenue();
  const { subscriptions, loaded, epoch, refresh, error, clearError } = store;
  const [tab, setTab] = useState<Tab>('live');
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('');
  const [cycle, setCycle] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const { focus } = store;
  useEffect(() => focus(openId), [focus, openId]);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(0);

  useEffect(() => setNow(Date.now()), []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const stats = useMemo(() => {
    const live = subscriptions.filter(isLive);
    const mrr = live.reduce((sum, sub) => sum + monthlyValue(sub), 0);
    const ref = now || epoch;
    const renewing = live.filter((sub) => sub.status === 'active' && !sub.cancelAtPeriodEnd && sub.periodEnd >= ref && sub.periodEnd - ref <= 7 * DAY);
    const churned = subscriptions.filter((sub) => sub.status === 'cancelled' && sub.cancelledAt && ref - sub.cancelledAt <= 30 * DAY).length;
    return {
      live: live.length,
      cancelling: live.filter((sub) => sub.cancelAtPeriodEnd).length,
      mrr,
      renewing: renewing.length,
      renewingValue: renewing.reduce((sum, sub) => sum + (sub.pendingChange?.amount ?? sub.amount), 0),
      churned,
      churn: live.length ? (churned / (live.length + churned)) * 100 : 0,
    };
  }, [subscriptions, now, epoch]);

  const counts = useMemo(() => {
    const map: Record<Tab, number> = { live: 0, past_due: 0, cancelling: 0, cancelled: 0, plans: 0 };
    for (const sub of subscriptions) {
      if (isLive(sub)) map.live += 1;
      if (sub.status === 'past_due') map.past_due += 1;
      if (isLive(sub) && sub.cancelAtPeriodEnd) map.cancelling += 1;
      if (sub.status === 'cancelled') map.cancelled += 1;
    }
    return map;
  }, [subscriptions]);

  const rows = useMemo(() => {
    if (tab === 'plans') return [];
    const q = query.trim().toLowerCase();
    return subscriptions
      .filter((sub) => {
        if (tab === 'live' && !isLive(sub)) return false;
        if (tab === 'past_due' && sub.status !== 'past_due') return false;
        if (tab === 'cancelling' && !(isLive(sub) && sub.cancelAtPeriodEnd)) return false;
        if (tab === 'cancelled' && sub.status !== 'cancelled') return false;
        if (plan && sub.plan !== plan) return false;
        if (cycle && sub.cycle !== cycle) return false;
        if (q && !`${sub.name} ${sub.email} ${sub.id}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (tab === 'cancelled' ? (b.cancelledAt ?? 0) - (a.cancelledAt ?? 0) : a.periodEnd - b.periodEnd));
  }, [subscriptions, tab, query, plan, cycle]);

  const visible = rows.slice(0, limit);
  const open = openId ? subscriptions.find((sub) => sub.id === openId) ?? null : null;
  const ready = loaded && now > 0;

  const filter = <T,>(fn: (value: T) => void) => (value: T) => {
    fn(value);
    setLimit(PAGE);
  };

  const renewLabel = (sub: Subscription) => {
    if (sub.status === 'cancelled') return { main: sub.cancelledAt ? formatDate(sub.cancelledAt) : '—', sub: 'cancelled', tone: '' };
    const days = Math.ceil((sub.periodEnd - now) / DAY);
    if (sub.status === 'past_due') return { main: formatDate(sub.periodEnd), sub: `overdue ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`, tone: styles.overdue };
    if (sub.cancelAtPeriodEnd) return { main: formatDate(sub.periodEnd), sub: `ends in ${days} day${days === 1 ? '' : 's'}`, tone: styles.ending };
    return { main: formatDate(sub.periodEnd), sub: days <= 0 ? 'renews today' : `renews in ${days} day${days === 1 ? '' : 's'}`, tone: '' };
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Subscriptions</h1>
          <p className={styles.subtitle}>Who is paying, on which plan, and when they renew</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.ghostButton} disabled={!ready || tab === 'plans' || rows.length === 0} onClick={() => download(`elab-subscriptions-${tab}.csv`, rows)}>
            <Download width={16} height={16} aria-hidden="true" />
            Export CSV
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
          <span className={styles.statValue}>{ready ? stats.live.toLocaleString('en-IN') : '—'}</span>
          <span className={styles.statLabel}>Active subscriptions</span>
          <span className={styles.statFoot}>{ready ? `${stats.cancelling} set to cancel at period end` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statSuccess)}>{ready ? formatINR(stats.mrr) : '—'}</span>
          <span className={styles.statLabel}>Monthly recurring revenue</span>
          <span className={styles.statFoot}>{ready ? `${formatCompactINR(stats.mrr * 12)} a year (ARR)` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ready ? stats.renewing.toLocaleString('en-IN') : '—'}</span>
          <span className={styles.statLabel}>Renewing in 7 days</span>
          <span className={styles.statFoot}>{ready ? `${formatCompactINR(stats.renewingValue)} expected` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, ready && stats.churn >= 5 && styles.statDanger)}>{ready ? `${stats.churn.toFixed(1)}%` : '—'}</span>
          <span className={styles.statLabel}>Churn, last 30 days</span>
          <span className={styles.statFoot}>{ready ? `${stats.churned} subscriptions ended` : ' '}</span>
        </div>
      </section>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Subscriptions view">
            {TABS.map((item) => (
              <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className={cx(styles.segment, tab === item.value && styles.segmentActive)} onClick={() => filter(setTab)(item.value)}>
                {item.label}
                {item.value !== 'plans' && <span className={styles.segmentCount}>{ready ? counts[item.value].toLocaleString('en-IN') : 0}</span>}
              </button>
            ))}
          </div>
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {tab === 'plans' ? (
          <PlansPanel store={store} onNotice={setNotice} />
        ) : (
          <>
            <div className={cx(styles.toolbar, styles.toolbarThree)}>
              <div className={styles.searchField}>
                <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
                <input className={styles.input} placeholder="Search by name, email or subscription ID" value={query} onChange={(event) => filter(setQuery)(event.target.value)} aria-label="Search subscriptions" />
              </div>
              <select className={styles.select} value={plan} onChange={(event) => filter(setPlan)(event.target.value)} aria-label="Filter by plan">
                <option value="">All plans</option>
                {Object.entries(PLAN_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
              <select className={styles.select} value={cycle} onChange={(event) => filter(setCycle)(event.target.value)} aria-label="Filter by billing cycle">
                <option value="">All billing cycles</option>
                {CYCLES.map((value) => (
                  <option key={value} value={value}>
                    {CYCLE_META[value].label}
                  </option>
                ))}
              </select>
            </div>

            {ready && rows.length > 0 && <p className={styles.count}>{`Showing ${visible.length} of ${rows.length.toLocaleString('en-IN')} subscriptions`}</p>}

            {!ready ? (
              <div className={styles.empty}>Loading…</div>
            ) : rows.length === 0 ? (
              <div className={styles.empty}>No subscriptions match the current filters.</div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={cx(styles.table, styles.subTable)}>
                    <thead>
                      <tr>
                        <th>Subscriber</th>
                        <th>Plan</th>
                        <th className={styles.numHead}>Amount</th>
                        <th>Started</th>
                        <th>{tab === 'cancelled' ? 'Ended' : 'Next renewal'}</th>
                        <th>Status</th>
                        <th className={styles.actionsHead}>
                          <span className={styles.srOnly}>Open</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((sub) => {
                        const st = STATUS_META[sub.status];
                        const renew = renewLabel(sub);
                        return (
                          <tr key={sub.id} className={cx(styles.clickRow, sub.status === 'cancelled' && styles.rowDim)} onClick={() => setOpenId(sub.id)}>
                            <td className={styles.contentCell}>
                              <button
                                type="button"
                                className={styles.rowLink}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenId(sub.id);
                                }}
                              >
                                {sub.name}
                              </button>
                              <span className={styles.meta}>{sub.institution ? `${sub.seats} seats · ${sub.email}` : sub.email}</span>
                            </td>
                            <td className={styles.nowrap}>
                              <span className={cx(styles.badge, styles[`tone_${PLAN_META[sub.plan].tone}`])}>{PLAN_META[sub.plan].label}</span>
                              <span className={styles.meta}>{CYCLE_META[sub.cycle].label}</span>
                            </td>
                            <td className={styles.numCell}>
                              {`${formatINR(sub.amount)}/${CYCLE_META[sub.cycle].short}`}
                              {sub.cycle !== 'monthly' && <span className={styles.meta}>{`${formatINR(monthlyValue(sub))}/mo`}</span>}
                            </td>
                            <td className={cx(styles.nowrap, styles.muted)}>{formatDate(sub.startedAt)}</td>
                            <td className={styles.nowrap}>
                              {renew.main}
                              <span className={cx(styles.meta, renew.tone)}>{renew.sub}</span>
                            </td>
                            <td className={styles.nowrap}>
                              <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
                              {sub.cancelAtPeriodEnd && sub.status !== 'cancelled' && <span className={cx(styles.meta, styles.ending)}>cancelling</span>}
                              {sub.pendingChange && <span className={styles.meta}>{`→ ${PLAN_META[sub.pendingChange.plan].label}`}</span>}
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
          </>
        )}
      </div>

      {open && ready && <SubscriptionDrawer key={open.id} sub={open} now={now} store={store} onNotice={setNotice} onClose={() => setOpenId(null)} />}
    </div>
  );
}
