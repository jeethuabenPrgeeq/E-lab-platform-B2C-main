'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, RotateCcw, Search } from 'lucide-react';
import { LineChart } from '@/features/admin/executions/ui/LineChart';
import { useRevenue } from '../../subscriptions/lib/api';
import { CYCLE_META, DAY, PAYMENT_STATUS_META, PLAN_META, cx, formatCompactINR, formatINR } from '../../subscriptions/lib/shared';
import type { Payment } from '../../subscriptions/lib/types';
import { InvoiceDrawer } from '../InvoiceDrawer/InvoiceDrawer';
import styles from '../ui/billing.module.css';

type Tab = 'all' | 'succeeded' | 'failed' | 'refunded' | 'requests';
type Range = 'today' | '7' | '30' | '60';

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All payments' },
  { value: 'succeeded', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'requests', label: 'Refund requests' },
];

const METHOD_LABEL: Record<Payment['method'], string> = { upi: 'UPI', card: 'Card', netbanking: 'Netbanking', invoice: 'Bank transfer' };
const PAGE = 25;
const CHART_COLOR = '#2d4cc8';

const net = (payment: Payment) => (payment.status === 'failed' ? 0 : payment.amount - payment.refunded);

function startOfDay(t: number) {
  const date = new Date(t);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatStamp(t: number) {
  return new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

function exportCsv(rows: Payment[]) {
  const head = ['invoice', 'date', 'customer', 'email', 'plan', 'cycle', 'list_price', 'discount', 'coupon', 'amount', 'refunded', 'status', 'method'];
  const lines = rows.map((payment) =>
    [payment.id, new Date(payment.at).toISOString(), payment.name, payment.email, PLAN_META[payment.plan].label, CYCLE_META[payment.cycle].label, String(payment.listAmount), String(payment.discount), payment.coupon ?? '', String(payment.amount), String(payment.refunded), PAYMENT_STATUS_META[payment.status].label, METHOD_LABEL[payment.method]]
      .map(csvCell)
      .join(','),
  );
  const url = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `elab-payments-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BillingPage() {
  const store = useRevenue();
  const { payments, loaded, refresh, error, clearError } = store;
  const [now, setNow] = useState(0);
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState('');
  const [method, setMethod] = useState('');
  const [range, setRange] = useState<Range>('30');
  const [limit, setLimit] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const { focusPayment } = store;
  useEffect(() => focusPayment(openId), [focusPayment, openId]);
  const [notice, setNotice] = useState('');

  useEffect(() => setNow(Date.now()), []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const ready = loaded && now > 0;
  const today = now ? startOfDay(now) : 0;

  const stats = useMemo(() => {
    if (!ready) return null;
    const month = new Date(now);
    month.setDate(1);
    month.setHours(0, 0, 0, 0);
    const monthStart = month.getTime();
    const todays = payments.filter((payment) => payment.at >= today && payment.status !== 'failed');
    const failed = payments.filter((payment) => payment.status === 'failed');
    const requests = payments.filter((payment) => payment.refundRequest?.status === 'pending');
    return {
      month: payments.filter((payment) => payment.at >= monthStart).reduce((sum, payment) => sum + net(payment), 0),
      monthRefunds: payments.filter((payment) => payment.at >= monthStart).reduce((sum, payment) => sum + payment.refunded, 0),
      today: todays.reduce((sum, payment) => sum + net(payment), 0),
      todayCount: todays.length,
      failed: failed.length,
      atRisk: failed.reduce((sum, payment) => sum + payment.amount, 0),
      requests: requests.length,
      requestValue: requests.reduce((sum, payment) => sum + payment.amount - payment.refunded, 0),
    };
  }, [payments, ready, now, today]);

  const chart = useMemo(() => {
    if (!ready) return null;
    const days = 30;
    const times = Array.from({ length: days }, (_, index) => today - (days - 1 - index) * DAY);
    const values = times.map(() => 0);
    for (const payment of payments) {
      const index = Math.floor((startOfDay(payment.at) - times[0]) / DAY);
      if (index >= 0 && index < days) values[index] += net(payment);
    }
    return { times, values };
  }, [payments, ready, today]);

  const counts = useMemo(() => {
    const map: Record<Tab, number> = { all: payments.length, succeeded: 0, failed: 0, refunded: 0, requests: 0 };
    for (const payment of payments) {
      if (payment.status === 'succeeded') map.succeeded += 1;
      if (payment.status === 'failed') map.failed += 1;
      if (payment.status === 'refunded' || payment.status === 'partially_refunded') map.refunded += 1;
      if (payment.refundRequest?.status === 'pending') map.requests += 1;
    }
    return map;
  }, [payments]);

  const rows = useMemo(() => {
    if (!ready) return [];
    const q = query.trim().toLowerCase();
    const from = range === 'today' ? today : now - Number(range) * DAY;
    return payments.filter((payment) => {
      if (tab === 'succeeded' && payment.status !== 'succeeded') return false;
      if (tab === 'failed' && payment.status !== 'failed') return false;
      if (tab === 'refunded' && payment.status !== 'refunded' && payment.status !== 'partially_refunded') return false;
      if (tab === 'requests' && payment.refundRequest?.status !== 'pending') return false;
      if (tab !== 'failed' && tab !== 'requests' && payment.at < from) return false;
      if (plan && payment.plan !== plan) return false;
      if (method && payment.method !== method) return false;
      if (q && !`${payment.id} ${payment.name} ${payment.email} ${payment.coupon ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [payments, ready, tab, query, plan, method, range, today, now]);

  const visible = rows.slice(0, limit);
  const open = openId ? payments.find((payment) => payment.id === openId) ?? null : null;

  const filter = <T,>(fn: (value: T) => void) => (value: T) => {
    fn(value);
    setLimit(PAGE);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Billing</h1>
          <p className={styles.subtitle}>Invoices, payments, failed charges and refunds. Amounts include 18% GST.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.ghostButton} onClick={() => void refresh()}>
            <RotateCcw width={16} height={16} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className={styles.ghostButton} disabled={!ready || rows.length === 0} onClick={() => exportCsv(rows)}>
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
          <span className={cx(styles.statValue, styles.statSuccess)}>{stats ? formatCompactINR(stats.month) : '—'}</span>
          <span className={styles.statLabel}>Collected this month</span>
          <span className={styles.statFoot}>{stats ? `After ${formatINR(stats.monthRefunds)} in refunds` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats ? formatINR(stats.today) : '—'}</span>
          <span className={styles.statLabel}>Payments today</span>
          <span className={styles.statFoot}>{stats ? `${stats.todayCount} successful charges` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats && stats.failed > 0 && styles.statDanger)}>{stats ? stats.failed : '—'}</span>
          <span className={styles.statLabel}>Failed payments</span>
          <span className={styles.statFoot}>{stats ? `${formatINR(stats.atRisk)} at risk` : ' '}</span>
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, stats && stats.requests > 0 && styles.statWarn)}>{stats ? stats.requests : '—'}</span>
          <span className={styles.statLabel}>Refund requests</span>
          <span className={styles.statFoot}>{stats ? `${formatINR(stats.requestValue)} requested` : ' '}</span>
        </div>
      </section>

      <div className={cx(styles.card, styles.chartCard)}>
        {chart ? (
          <LineChart
            title="Collected per day · last 30 days, after refunds"
            times={chart.times}
            series={[{ key: 'collected', label: 'Collected', color: CHART_COLOR, values: chart.values }]}
            format={(value) => formatCompactINR(value)}
            timeLabel={(t) => new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            tickLabel={(t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            area
            height={220}
          />
        ) : (
          <div className={styles.empty}>Loading…</div>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.segmented} role="tablist" aria-label="Payment status">
            {TABS.map((item) => (
              <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className={cx(styles.segment, tab === item.value && styles.segmentActive)} onClick={() => filter(setTab)(item.value)}>
                {item.label}
                <span className={styles.segmentCount}>{ready ? counts[item.value].toLocaleString('en-IN') : 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={cx(styles.toolbar, styles.toolbarFour)}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input className={styles.input} placeholder="Search invoice, name, email or coupon" value={query} onChange={(event) => filter(setQuery)(event.target.value)} aria-label="Search payments" />
          </div>
          <select className={styles.select} value={plan} onChange={(event) => filter(setPlan)(event.target.value)} aria-label="Filter by plan">
            <option value="">All plans</option>
            {Object.entries(PLAN_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={method} onChange={(event) => filter(setMethod)(event.target.value)} aria-label="Filter by payment method">
            <option value="">All methods</option>
            {Object.entries(METHOD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={range} disabled={tab === 'failed' || tab === 'requests'} onChange={(event) => filter(setRange)(event.target.value as Range)} aria-label="Date range">
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
          </select>
        </div>

        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}

        {ready && rows.length > 0 && <p className={styles.count}>{`Showing ${visible.length} of ${rows.length.toLocaleString('en-IN')} payments · ${formatINR(rows.reduce((sum, payment) => sum + net(payment), 0))} net`}</p>}

        {!ready ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No payments match the current filters.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={cx(styles.table, styles.payTable)}>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th className={styles.numHead}>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th className={styles.actionsHead}>
                      <span className={styles.srOnly}>Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((payment) => {
                    const st = PAYMENT_STATUS_META[payment.status];
                    return (
                      <tr key={payment.id} className={styles.clickRow} onClick={() => setOpenId(payment.id)}>
                        <td className={styles.nowrap}>
                          <button
                            type="button"
                            className={cx(styles.rowLink, styles.mono)}
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenId(payment.id);
                            }}
                          >
                            {payment.id}
                          </button>
                          <span className={styles.meta}>{formatStamp(payment.at)}</span>
                        </td>
                        <td className={styles.contentCell}>
                          <span className={styles.primaryText}>{payment.name}</span>
                          <span className={styles.meta}>{payment.email}</span>
                        </td>
                        <td className={styles.nowrap}>
                          <span className={cx(styles.badge, styles[`tone_${PLAN_META[payment.plan].tone}`])}>{PLAN_META[payment.plan].label}</span>
                          <span className={styles.meta}>{CYCLE_META[payment.cycle].label}</span>
                        </td>
                        <td className={styles.numCell}>
                          {formatINR(payment.amount)}
                          {payment.discount > 0 && <span className={styles.meta}>{`−${formatINR(payment.discount)} ${payment.coupon}`}</span>}
                          {payment.refunded > 0 && <span className={cx(styles.meta, styles.text_danger)}>{`−${formatINR(payment.refunded)} refunded`}</span>}
                        </td>
                        <td className={cx(styles.nowrap, styles.muted)}>{METHOD_LABEL[payment.method]}</td>
                        <td className={styles.nowrap}>
                          <span className={cx(styles.badge, styles[`tone_${st.tone}`])}>{st.label}</span>
                          {payment.refundRequest?.status === 'pending' && <span className={cx(styles.meta, styles.text_warning)}>refund requested</span>}
                          {payment.attempts.length > 1 && payment.status !== 'failed' && <span className={styles.meta}>{`after ${payment.attempts.length - 1} ${payment.attempts.length === 2 ? 'retry' : 'retries'}`}</span>}
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

      {open && ready && <InvoiceDrawer key={open.id} payment={open} subscription={store.subMap.get(open.subscriptionId) ?? null} now={now} store={store} onNotice={setNotice} onClose={() => setOpenId(null)} />}
    </div>
  );
}
