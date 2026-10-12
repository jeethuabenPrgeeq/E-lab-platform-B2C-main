'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { LineChart } from '@/features/admin/executions/ui/LineChart';
import { LANGUAGES, PROBLEMS } from '../lib/data';
import { useFlags } from '../lib/flags';
import { problemHealth, series, slice, summarize } from '../lib/metrics';
import { DIFFICULTY_META, HOUR, SUB_RANGES, cx, formatClock, formatDay, formatNumber, formatPercent } from '../lib/shared';
import { useSubmissions } from '../lib/store';
import type { SubRange } from '../lib/types';
import { SubHeader } from '../ui/SubHeader';
import { VerdictBars } from '../ui/VerdictBars';
import styles from '../ui/sub.module.css';

const BLUE = '#2d4cc8';
const ORANGE = '#c2610f';

function Delta({ text, tone }: { text: string; tone: 'good' | 'bad' | 'flat' }) {
  const Icon = tone === 'flat' ? ArrowRight : text.startsWith('-') ? ArrowDownRight : ArrowUpRight;
  return (
    <span className={cx(styles.statFoot, tone === 'good' && styles.deltaGood, tone === 'bad' && styles.deltaBad)}>
      <Icon width={14} height={14} aria-hidden="true" />
      {text}
    </span>
  );
}

export default function OverviewPage() {
  const [live, setLive] = useState(true);
  const [range, setRange] = useState<SubRange>('7d');
  const { snap, persist, reset } = useSubmissions(live);
  const flags = useFlags(snap, persist);
  const pending = flags.filter((item) => !item.decision).length;
  const running = persist.jobs.some((job) => job.status === 'running');

  const latest = useRef(snap);
  latest.current = snap;
  const def = SUB_RANGES.find((item) => item.value === range)!;
  const bucket = def.bucketHours * HOUR;
  const end = snap ? Math.floor(snap.now / bucket) * bucket + bucket : 0;
  const count = snap?.all.length ?? 0;

  const data = useMemo(() => {
    const current = latest.current;
    if (!current || !count) return null;
    const span = def.hours * HOUR;
    const now = current.now;
    return {
      series: series(current.all, range, end, persist),
      now: summarize(slice(current.all, now - span, now + 1), persist),
      prev: summarize(slice(current.all, now - 2 * span, now - span), persist),
      health: problemHealth(current.all, now, persist),
    };
  }, [count, range, end, def.hours, persist]);

  const rangeLabel = def.label;
  const pct = (a: number, b: number) => (b ? (a - b) / b : 0);
  const totalChange = data ? pct(data.now.total, data.prev.total) : 0;
  const accChange = data ? data.now.acceptance - data.prev.acceptance : 0;
  const attentions = data?.health.filter((item) => item.status !== 'ok') ?? [];
  const tick = (t: number) => (def.bucketHours >= 6 ? formatDay(t) : formatClock(t));
  const label = (t: number) =>
    def.bucketHours >= 24 ? formatDay(t) : def.bucketHours >= 6 ? `${formatDay(t)}, ${formatClock(t)} – ${formatClock(t + bucket)}` : `${formatClock(t)} – ${formatClock(t + bucket)}`;

  return (
    <div className={styles.page}>
      <SubHeader
        subtitle="Verdicts, acceptance and problem health across learner submissions"
        live={live}
        pending={pending}
        running={running}
        onToggleLive={() => setLive((value) => !value)}
        onReset={reset}
      />

      <div className={styles.filterRow}>
        <div className={styles.segmented} role="radiogroup" aria-label="Time range">
          {SUB_RANGES.map((item) => (
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
        {snap && <span className={styles.updated}>{`Updated ${formatClock(snap.now)}`}</span>}
      </div>

      {attentions.some((item) => item.status === 'broken') && (
        <div className={cx(styles.banner, styles.bannerDanger)} role="status">
          <AlertTriangle width={18} height={18} aria-hidden="true" />
          <span>
            {`Acceptance collapsed on ${attentions
              .filter((item) => item.status === 'broken')
              .map((item) => PROBLEMS[item.index].title)
              .join(', ')} in the last 48 hours — likely a broken test case.`}
          </span>
          <Link href="/submissions/rejudge" className={styles.bannerLink}>
            Rejudge
          </Link>
        </div>
      )}

      <section className={cx(styles.stats, styles.stats4)} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data ? formatNumber(data.now.total) : '—'}</span>
          <span className={styles.statLabel}>Submissions</span>
          {data && (
            <Delta text={`${totalChange >= 0 ? '+' : ''}${(totalChange * 100).toFixed(0)}% vs previous ${rangeLabel}`} tone="flat" />
          )}
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data ? formatPercent(data.now.acceptance) : '—'}</span>
          <span className={styles.statLabel}>Acceptance rate</span>
          {data && (
            <Delta
              text={`${accChange >= 0 ? '+' : ''}${(accChange * 100).toFixed(1)} pts vs previous ${rangeLabel}`}
              tone={Math.abs(accChange) < 0.005 ? 'flat' : accChange > 0 ? 'good' : 'bad'}
            />
          )}
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data ? formatNumber(data.now.learners) : '—'}</span>
          <span className={styles.statLabel}>Active learners</span>
          {data && <span className={styles.statFoot}>{`${(data.now.total / Math.max(1, data.now.learners)).toFixed(1)} submissions each`}</span>}
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{data ? data.now.avgAttempts.toFixed(2) : '—'}</span>
          <span className={styles.statLabel}>Attempts to accept</span>
          {data && <span className={styles.statFoot}>Average attempt number of accepted runs</span>}
        </div>
      </section>

      <div className={styles.chartGrid}>
        <div className={cx(styles.card, styles.span2)}>
          {data ? (
            <LineChart
              title="Submissions and accepted"
              times={data.series.map((item) => item.t)}
              series={[
                { key: 'total', label: 'Submissions', color: BLUE, values: data.series.map((item) => item.total) },
                { key: 'accepted', label: 'Accepted', color: ORANGE, values: data.series.map((item) => item.accepted) },
              ]}
              format={(value) => formatNumber(Math.round(value))}
              timeLabel={label}
              tickLabel={tick}
              height={260}
            />
          ) : (
            <div className={styles.empty}>Loading…</div>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Verdicts</h2>
          {data ? (
            <>
              <VerdictBars verdicts={data.now.verdicts} total={data.now.total} />
              <h3 className={styles.subTitle}>Acceptance by language</h3>
              <ul className={styles.langList}>
                {data.now.languages.map((lang) => {
                  const rate = lang.total ? lang.accepted / lang.total : 0;
                  return (
                    <li key={lang.index} className={styles.langRow}>
                      <span className={styles.langName}>{LANGUAGES[lang.index].name}</span>
                      <span className={styles.barTrack} aria-hidden="true">
                        <span className={cx(styles.barFill, styles.fill_primary)} style={{ width: `${rate * 100}%` }} />
                      </span>
                      <span className={styles.outcomeValue}>
                        <strong>{formatPercent(rate, 0)}</strong>
                        <span>{formatNumber(lang.total)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className={styles.empty}>Loading…</div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Problem health</h2>
            <span className={styles.updated}>Last 48 h vs previous 28 days</span>
          </div>
          {data ? (
            <div className={styles.tableWrap}>
              <table className={cx(styles.table, styles.compactTable)}>
                <thead>
                  <tr>
                    <th>Problem</th>
                    <th className={styles.num}>48 h</th>
                    <th className={styles.num}>Before</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.health.slice(0, 6).map((item) => {
                    const problem = PROBLEMS[item.index];
                    const recent = item.recentTotal ? item.recentAc / item.recentTotal : 0;
                    const before = item.baseTotal ? item.baseAc / item.baseTotal : 0;
                    return (
                      <tr key={problem.id}>
                        <td>
                          <span className={styles.primaryText}>{problem.title}</span>
                          <span className={cx(styles.subText, styles[`text_${DIFFICULTY_META[problem.difficulty].tone}`])}>
                            {`${DIFFICULTY_META[problem.difficulty].label} · ${item.recentTotal} recent`}
                          </span>
                        </td>
                        <td className={cx(styles.num, item.status === 'broken' && styles.textDanger)}>{formatPercent(recent, 0)}</td>
                        <td className={styles.num}>{formatPercent(before, 0)}</td>
                        <td>
                          {item.status === 'broken' ? (
                            <Link href={`/submissions/rejudge?problem=${problem.id}`} className={cx(styles.badge, styles.tone_danger, styles.badgeLink)}>
                              Broken test?
                            </Link>
                          ) : item.status === 'low' ? (
                            <span className={cx(styles.badge, styles.tone_warning)}>Low</span>
                          ) : (
                            <span className={cx(styles.badge, styles.tone_success)}>Healthy</span>
                          )}
                        </td>
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