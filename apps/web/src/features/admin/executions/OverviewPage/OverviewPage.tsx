'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BellRing } from 'lucide-react';
import { useAlerts } from '../lib/alerts';
import { completeMinutes, rangeSeries, summarize, windowOf } from '../lib/metrics';
import { RANGES, cx, formatClock, formatMs, formatNumber, formatPercent } from '../lib/shared';
import { resetMonitor, useMonitor } from '../lib/store';
import type { Range } from '../lib/types';
import { LineChart } from '../ui/LineChart';
import { MonitorHeader } from '../ui/MonitorHeader';
import { OutcomeBars } from '../ui/OutcomeBars';
import styles from '../ui/monitor.module.css';

const MIN = 60_000;
const P50 = '#2d4cc8';
const P95 = '#c2610f';

function Delta({ current, previous, higherIsBad, label }: { current: number; previous: number; higherIsBad?: boolean; label: string }) {
  if (!previous) return <span className={styles.statFoot}>{`No data for previous ${label}`}</span>;
  const change = (current - previous) / previous;
  const flat = Math.abs(change) < 0.02;
  const Icon = flat ? ArrowRight : change > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = flat || higherIsBad === undefined ? '' : (change > 0) === higherIsBad ? styles.deltaBad : styles.deltaGood;
  return (
    <span className={cx(styles.statFoot, tone)}>
      <Icon width={14} height={14} aria-hidden="true" />
      {`${flat ? 'Flat' : `${change > 0 ? '+' : ''}${(change * 100).toFixed(0)}%`} vs previous ${label}`}
    </span>
  );
}

export default function OverviewPage() {
  const [live, setLive] = useState(true);
  const [range, setRange] = useState<Range>('1h');
  const { snap, refresh } = useMonitor(live);
  const { statuses, firing, resetAcks } = useAlerts(snap);

  const latest = useRef(snap);
  latest.current = snap;
  const end = snap ? Math.floor(snap.now / MIN) * MIN : 0;
  const epoch = snap?.epoch ?? 0;
  const def = RANGES.find((item) => item.value === range)!;

  const data = useMemo(() => {
    const current = latest.current;
    if (!current || !end) return null;
    const minutes = completeMinutes(current.minutes, current.now);
    const span = def.minutes * MIN;
    return {
      series: rangeSeries(minutes, range, end),
      now: summarize(windowOf(minutes, end - span, end), def.minutes),
      prev: summarize(windowOf(minutes, end - 2 * span, end - span), def.minutes),
    };
  }, [end, epoch, range, def.minutes]);

  const firingNow = statuses.filter((status) => status.state === 'firing' || status.state === 'acknowledged');
  const times = data?.series.map((bucket) => bucket.t) ?? [];
  const bucketMs = def.bucket * MIN;
  const timeLabel = (t: number) => (def.bucket === 1 ? formatClock(t) : `${formatClock(t)} – ${formatClock(t + bucketMs)}`);
  const rangeLabel = def.label.replace(/^1 /, '');

  return (
    <div className={styles.page}>
      <MonitorHeader
        subtitle="Throughput, run time and outcomes of code executed in the judge sandboxes"
        live={live}
        firing={firing}
        onToggleLive={() => setLive((value) => !value)}
        onReset={() => {
          resetMonitor();
          resetAcks();
          refresh();
        }}
      />

      <div className={styles.filterRow}>
        <div className={styles.segmented} role="radiogroup" aria-label="Time range">
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={range === item.value}
              className={cx(styles.segment, range === item.value && styles.segmentActive)}
              onClick={() => setRange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {snap && <span className={styles.updated}>{`Updated ${formatClock(snap.now, true)}`}</span>}
      </div>

      {firingNow.length > 0 && (
        <div className={cx(styles.banner, styles.bannerDanger)} role="status">
          <BellRing width={18} height={18} aria-hidden="true" />
          <span>
            {`${firingNow.length} alert${firingNow.length === 1 ? '' : 's'} firing: `}
            {firingNow.map((status) => status.rule.name).join(', ')}
          </span>
          <Link href="/executions/alerts" className={styles.bannerLink}>
            View alerts
          </Link>
        </div>
      )}

      <section className={cx(styles.stats, styles.stats4)} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data ? formatNumber(data.now.total) : '—'}</span>
          <span className={styles.statLabel}>Executions</span>
          {data && <Delta current={data.now.total} previous={data.prev.total} label={rangeLabel} />}
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data ? data.now.perMinute.toFixed(1) : '—'}</span>
          <span className={styles.statLabel}>Per minute</span>
          {data && <span className={styles.statFoot}>{`Peak ${Math.max(0, ...data.series.map((bucket) => bucket.perMinute)).toFixed(0)} / min`}</span>}
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data ? formatMs(data.now.p95) : '—'}</span>
          <span className={styles.statLabel}>p95 run time</span>
          {data && <Delta current={data.now.p95} previous={data.prev.p95} higherIsBad label={rangeLabel} />}
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, data && data.now.sandboxRate > 0.02 && styles.statDanger)}>{data ? formatNumber(data.now.outcomes.sandbox) : '—'}</span>
          <span className={styles.statLabel}>Sandbox errors</span>
          {data && <span className={styles.statFoot}>{`${formatPercent(data.now.sandboxRate)} of executions`}</span>}
        </div>
      </section>

      <div className={styles.chartGrid}>
        <div className={styles.card}>
          {data ? (
            <LineChart
              title="Executions per minute"
              times={times}
              series={[{ key: 'rate', label: 'Executions / min', color: P50, values: data.series.map((bucket) => bucket.perMinute) }]}
              format={(value) => (Number.isInteger(value) || value >= 10 ? value.toFixed(0) : value.toFixed(1))}
              timeLabel={timeLabel}
              tickLabel={(t) => formatClock(t)}
              area
            />
          ) : (
            <div className={styles.empty}>Loading…</div>
          )}
        </div>
        <div className={styles.card}>
          {data ? (
            <LineChart
              title="Run time"
              times={times}
              series={[
                { key: 'p50', label: 'p50', color: P50, values: data.series.map((bucket) => bucket.p50) },
                { key: 'p95', label: 'p95', color: P95, values: data.series.map((bucket) => bucket.p95) },
              ]}
              format={formatMs}
              timeLabel={timeLabel}
              tickLabel={(t) => formatClock(t)}
              reference={{ value: 1200, label: 'Alert at 1.2 s' }}
            />
          ) : (
            <div className={styles.empty}>Loading…</div>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Outcomes</h2>
          {data ? <OutcomeBars outcomes={data.now.outcomes} total={data.now.total} /> : <div className={styles.empty}>Loading…</div>}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>By language</h2>
          {data ? (
            <div className={styles.tableWrap}>
              <table className={cx(styles.table, styles.compactTable)}>
                <thead>
                  <tr>
                    <th>Language</th>
                    <th>Executions</th>
                    <th className={styles.num}>Avg time</th>
                    <th className={styles.num}>Failures</th>
                  </tr>
                </thead>
                <tbody>
                  {data.now.languages.map((lang) => {
                    const share = data.now.total ? lang.count / data.now.total : 0;
                    const failRate = lang.count ? lang.failures / lang.count : 0;
                    return (
                      <tr key={lang.name}>
                        <td>
                          <span className={styles.primaryText}>{lang.name}</span>
                        </td>
                        <td>
                          <span className={styles.shareCell}>
                            <span className={styles.shareValue}>{formatNumber(lang.count)}</span>
                            <span className={styles.barTrack} aria-hidden="true">
                              <span className={cx(styles.barFill, styles.fill_primary)} style={{ width: `${share * 100}%` }} />
                            </span>
                          </span>
                        </td>
                        <td className={styles.num}>{formatMs(lang.avgMs)}</td>
                        <td className={cx(styles.num, failRate > 0.2 && styles.textDanger)}>{formatPercent(failRate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}