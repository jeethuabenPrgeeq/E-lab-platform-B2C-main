'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { LineChart } from '@/features/admin/executions/ui/LineChart';
import { useCatalog } from '../../content/lib/data';
import { useRevenue } from '../../subscriptions/lib/api';
import { PLAN_META, cx, formatCompactINR, formatINR, isLive, monthlyValue } from '../../subscriptions/lib/shared';
import { RANGE_META, buildCohorts, buildDaily, buildMrr, bucketize, monthlyActive, pctChange, summarize, type Range } from '../lib/data';
import styles from '../ui/analytics.module.css';

const SERIES_A = '#2d4cc8';
const SERIES_B = '#c2610f';
const RANGES: Range[] = ['30d', '90d', '12m'];

function Delta({ value, previous }: { value: number | null; previous: string }) {
  if (value === null || !Number.isFinite(value)) return <span className={styles.statFoot}>No earlier data</span>;
  const up = value >= 0;
  return (
    <span className={cx(styles.delta, up ? styles.deltaUp : styles.deltaDown)}>
      {up ? <ArrowUpRight width={14} height={14} aria-hidden="true" /> : <ArrowDownRight width={14} height={14} aria-hidden="true" />}
      {`${up ? '+' : ''}${value.toFixed(1)}%`}
      <span className={styles.deltaText}>{`vs ${previous}`}</span>
    </span>
  );
}

function hashShare(text: string, min: number, max: number) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return min + (hash % 1000) / 1000 * (max - min);
}

export default function AnalyticsPage() {
  const revenue = useRevenue();
  const catalog = useCatalog();
  const [range, setRange] = useState<Range>('30d');
  const [now, setNow] = useState(0);

  useEffect(() => setNow(Date.now()), []);

  const daily = useMemo(() => (now ? buildDaily(now) : []), [now]);
  const meta = RANGE_META[range];
  const ready = now > 0 && revenue.loaded && catalog.loaded;

  const kpis = useMemo(() => {
    if (!daily.length) return null;
    const current = summarize(daily, meta.days);
    const previous = summarize(daily, meta.days, meta.days);
    const mauNow = monthlyActive(daily);
    const mauPrev = monthlyActive(daily, meta.days);
    return {
      mau: mauNow,
      mauDelta: pctChange(mauNow, mauPrev),
      signups: current.signups,
      signupDelta: pctChange(current.signups, previous.signups),
      conversion: current.trials ? (current.paid / current.trials) * 100 : 0,
      conversionDelta: previous.trials && current.trials ? pctChange(current.paid / current.trials, previous.paid / previous.trials) : null,
      current,
    };
  }, [daily, meta.days]);

  const money = useMemo(() => {
    if (!revenue.loaded) return null;
    const live = revenue.subscriptions.filter(isLive);
    const mrr = live.reduce((sum, sub) => sum + monthlyValue(sub), 0);
    const individual = live.filter((sub) => sub.plan !== 'enterprise');
    const individualMrr = individual.reduce((sum, sub) => sum + monthlyValue(sub), 0);
    const enterprise = live
      .filter((sub) => sub.plan === 'enterprise')
      .map((sub) => {
        const active = Math.round((sub.seats ?? 0) * hashShare(sub.id, 0.52, 0.93));
        return { id: sub.id, name: sub.name, seats: sub.seats ?? 0, active, contract: sub.amount, solved: Math.round(hashShare(sub.name, 14, 58)) };
      })
      .sort((a, b) => b.seats - a.seats);
    const byPlan = (['starter', 'professional', 'premium', 'enterprise'] as const).map((plan) => {
      const subs = live.filter((sub) => sub.plan === plan);
      return { plan, count: subs.length, mrr: subs.reduce((sum, sub) => sum + monthlyValue(sub), 0) };
    });
    return { mrr, arpu: individual.length ? individualMrr / individual.length : 0, enterprise, byPlan };
  }, [revenue.loaded, revenue.subscriptions]);

  const growth = useMemo(() => (daily.length ? bucketize(daily, range) : []), [daily, range]);
  const mrrSeries = useMemo(() => (now && money ? buildMrr(now, money.mrr) : []), [now, money]);
  const cohorts = useMemo(() => (now ? buildCohorts(now) : []), [now]);

  const techs = useMemo(() => {
    const map = new Map<string, { learners: number; items: number; completion: number }>();
    for (const item of catalog.items) {
      if (item.visibility !== 'listed') continue;
      const entry = map.get(item.technology) ?? { learners: 0, items: 0, completion: 0 };
      entry.learners += item.learners;
      entry.items += 1;
      entry.completion += item.completion * item.learners;
      map.set(item.technology, entry);
    }
    return [...map.entries()]
      .map(([name, entry]) => ({ name, learners: entry.learners, items: entry.items, completion: entry.learners ? Math.round(entry.completion / entry.learners) : 0 }))
      .sort((a, b) => b.learners - a.learners)
      .slice(0, 12);
  }, [catalog.items]);

  const funnel = kpis
    ? [
        { label: 'Visited eLab', value: kpis.current.visitors },
        { label: 'Signed up', value: kpis.current.signups },
        { label: 'Solved a first problem', value: kpis.current.firstSolve },
        { label: 'Started a trial', value: kpis.current.trials },
        { label: 'Became paying', value: kpis.current.paid },
      ]
    : [];

  const bucketLabel = (t: number) =>
    meta.bucket === 'month'
      ? new Date(t).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      : meta.bucket === 'week'
        ? `Week of ${new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
        : new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const maxTech = techs[0]?.learners ?? 1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>How eLab is growing, converting and keeping learners</p>
        </div>
        <div className={styles.segmented} role="tablist" aria-label="Date range">
          {RANGES.map((value) => (
            <button key={value} type="button" role="tab" aria-selected={range === value} className={cx(styles.segment, range === value && styles.segmentActive)} onClick={() => setRange(value)}>
              {RANGE_META[value].label}
            </button>
          ))}
        </div>
      </div>

      <section className={styles.stats} aria-label="Key numbers">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{kpis ? kpis.mau.toLocaleString('en-IN') : '—'}</span>
          <span className={styles.statLabel}>Monthly active learners</span>
          {kpis ? <Delta value={kpis.mauDelta} previous={meta.previous} /> : <span className={styles.statFoot}> </span>}
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{kpis ? kpis.signups.toLocaleString('en-IN') : '—'}</span>
          <span className={styles.statLabel}>New sign-ups</span>
          {kpis ? <Delta value={kpis.signupDelta} previous={meta.previous} /> : <span className={styles.statFoot}> </span>}
        </div>
        <div className={styles.statCard}>
          <span className={cx(styles.statValue, styles.statSuccess)}>{kpis ? `${kpis.conversion.toFixed(1)}%` : '—'}</span>
          <span className={styles.statLabel}>Trial to paid</span>
          {kpis ? <Delta value={kpis.conversionDelta} previous={meta.previous} /> : <span className={styles.statFoot}> </span>}
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{money ? formatINR(money.arpu) : '—'}</span>
          <span className={styles.statLabel}>Revenue per paying learner</span>
          <span className={styles.statFoot}>Individual plans, per month · excludes Enterprise</span>
        </div>
      </section>

      <div className={cx(styles.card, styles.block)}>
        {growth.length ? (
          <LineChart
            title={`Sign-ups and new paid subscriptions · ${meta.label.toLowerCase()}, per ${meta.bucket}`}
            times={growth.map((point) => point.t)}
            series={[
              { key: 'signups', label: 'Sign-ups', color: SERIES_A, values: growth.map((point) => point.signups) },
              { key: 'paid', label: 'New paid subscriptions', color: SERIES_B, values: growth.map((point) => point.paid) },
            ]}
            format={(value) => Math.round(value).toLocaleString('en-IN')}
            timeLabel={bucketLabel}
            tickLabel={(t) => new Date(t).toLocaleDateString('en-IN', meta.bucket === 'month' ? { month: 'short' } : { day: 'numeric', month: 'short' })}
            height={260}
          />
        ) : (
          <div className={styles.empty}>Loading…</div>
        )}
      </div>

      <div className={styles.twoCol}>
        <div className={styles.card}>
          {mrrSeries.length ? (
            <LineChart
              title="Monthly recurring revenue · last 12 months"
              times={mrrSeries.map((point) => point.t)}
              series={[{ key: 'mrr', label: 'MRR', color: SERIES_A, values: mrrSeries.map((point) => point.mrr) }]}
              format={(value) => formatCompactINR(value)}
              timeLabel={(t) => new Date(t).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              tickLabel={(t) => new Date(t).toLocaleDateString('en-IN', { month: 'short' })}
              area
              height={240}
            />
          ) : (
            <div className={styles.empty}>Loading…</div>
          )}
          {mrrSeries.length > 1 && (
            <p className={styles.cardFoot}>{`${formatCompactINR(mrrSeries[mrrSeries.length - 1].mrr)} now, up ${Math.round((mrrSeries[mrrSeries.length - 1].mrr / mrrSeries[0].mrr - 1) * 100)}% from ${new Date(mrrSeries[0].t).toLocaleDateString('en-IN', { month: 'long' })}`}</p>
          )}
          {money && (
            <>
              <h3 className={styles.subTitle}>MRR by plan today</h3>
              <ul className={styles.bars}>
                {money.byPlan.map((row) => (
                  <li key={row.plan} className={styles.barRow} title={`${PLAN_META[row.plan].label}: ${formatINR(row.mrr)} a month from ${row.count.toLocaleString('en-IN')} subscriptions`}>
                    <span className={styles.barName}>{PLAN_META[row.plan].label}</span>
                    <span className={styles.barTrack}>
                      <span className={styles.barFill} style={{ width: `${money.mrr ? (row.mrr / money.mrr) * 100 : 0}%` }} />
                    </span>
                    <span className={styles.barValue}>{`${money.mrr ? Math.round((row.mrr / money.mrr) * 100) : 0}%`}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{`Conversion funnel · ${meta.label.toLowerCase()}`}</h2>
          <ol className={styles.funnel}>
            {funnel.map((step, index) => {
              const width = funnel[0].value ? Math.max(4, (step.value / funnel[0].value) * 100) : 0;
              const fromPrev = index > 0 && funnel[index - 1].value ? Math.round((step.value / funnel[index - 1].value) * 100) : null;
              return (
                <li key={step.label} className={styles.funnelRow}>
                  <span className={styles.funnelLabel}>
                    <span>{step.label}</span>
                    <strong>{step.value.toLocaleString('en-IN')}</strong>
                  </span>
                  <span className={styles.funnelTrack} title={`${step.label}: ${step.value.toLocaleString('en-IN')}`}>
                    <span className={styles.funnelBar} style={{ width: `${width}%` }} />
                  </span>
                  <span className={styles.funnelRate}>{fromPrev === null ? 'Start' : `${fromPrev}% of the step above`}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className={cx(styles.card, styles.block)}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Retention by sign-up month</h2>
          <span className={styles.legendScale} aria-hidden="true">
            <span>0%</span>
            <span className={styles.scaleBar} />
            <span>100%</span>
          </span>
        </div>
        <p className={styles.cardFoot}>Share of each month’s new learners who were still active in later months.</p>
        <div className={styles.tableWrap}>
          <table className={styles.cohort}>
            <thead>
              <tr>
                <th>Cohort</th>
                <th className={styles.numHead}>Learners</th>
                {[0, 1, 2, 3, 4, 5].map((month) => (
                  <th key={month} className={styles.cohortHead}>{month === 0 ? 'Month 0' : `+${month}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.label}>
                  <th scope="row" className={styles.cohortLabel}>{cohort.label}</th>
                  <td className={styles.numCell}>{cohort.size.toLocaleString('en-IN')}</td>
                  {cohort.retention.map((value, month) => (
                    <td key={month} className={styles.cohortCell}>
                      {value === null ? (
                        <span className={styles.cohortEmpty} aria-label="Not yet">·</span>
                      ) : (
                        <span className={cx(styles.cohortValue, value >= 55 && styles.cohortStrong)} style={{ background: `rgba(45, 76, 200, ${(0.08 + (value / 100) * 0.82).toFixed(2)})` }} title={`${cohort.label}, month ${month}: ${value}% still active`}>
                          {`${value}%`}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={cx(styles.card, styles.fillCard)}>
          <h2 className={styles.cardTitle}>Most-learned technologies</h2>
          <p className={styles.cardFoot}>Learners across listed catalog items</p>
          {!ready ? (
            <div className={styles.empty}>Loading…</div>
          ) : (
            <ul className={cx(styles.bars, styles.barsFill)}>
              {techs.map((tech) => (
                <li key={tech.name} className={styles.barRow} title={`${tech.name}: ${tech.learners.toLocaleString('en-IN')} learners across ${tech.items} items, ${tech.completion}% completion`}>
                  <span className={styles.barName}>{tech.name}</span>
                  <span className={styles.barTrack}>
                    <span className={styles.barFill} style={{ width: `${(tech.learners / maxTech) * 100}%` }} />
                  </span>
                  <span className={styles.barValue}>{tech.learners.toLocaleString('en-IN')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Largest institutions</h2>
          <p className={styles.cardFoot}>Enterprise seats in use over the last 30 days</p>
          {!money ? (
            <div className={styles.empty}>Loading…</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={cx(styles.table, styles.instTable)}>
                <thead>
                  <tr>
                    <th>Institution</th>
                    <th>Seats in use</th>
                    <th className={styles.numHead}>Contract</th>
                  </tr>
                </thead>
                <tbody>
                  {money.enterprise.slice(0, 7).map((inst) => {
                    const share = Math.round((inst.active / Math.max(1, inst.seats)) * 100);
                    return (
                      <tr key={inst.id}>
                        <td>
                          <span className={styles.primaryText}>{inst.name}</span>
                          <span className={styles.meta}>{`${inst.solved} problems solved per learner`}</span>
                        </td>
                        <td>
                          <span className={styles.meterCell}>
                            <span className={styles.meter} aria-hidden="true">
                              <span className={cx(styles.meterFill, share < 60 && styles.meterLow)} style={{ width: `${share}%` }} />
                            </span>
                            {`${inst.active} / ${inst.seats}`}
                          </span>
                        </td>
                        <td className={styles.numCell}>{`${formatCompactINR(inst.contract)}/yr`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
