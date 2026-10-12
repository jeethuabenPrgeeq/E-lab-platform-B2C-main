'use client';

import { useMemo, useState } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { useAlerts, type RuleState } from '../lib/alerts';
import { ALERT_RULES } from '../lib/metrics';
import { cx, formatAgo, formatClock, formatDuration } from '../lib/shared';
import { resetMonitor, useMonitor } from '../lib/store';
import { MonitorHeader } from '../ui/MonitorHeader';
import styles from '../ui/monitor.module.css';

const STATE_META: Record<RuleState, { label: string; tone: string }> = {
  firing: { label: 'Firing', tone: 'danger' },
  acknowledged: { label: 'Acknowledged', tone: 'warning' },
  silenced: { label: 'Silenced', tone: 'neutral' },
  ok: { label: 'OK', tone: 'success' },
};

const SEVERITY_META = {
  critical: { label: 'Critical', tone: 'danger' },
  warning: { label: 'Warning', tone: 'warning' },
} as const;

export default function AlertsPage() {
  const [live, setLive] = useState(true);
  const { snap, refresh } = useMonitor(live);
  const { statuses, events, firing, acknowledge, silence, unsilence, resetAcks } = useAlerts(snap);
  const [ruleFilter, setRuleFilter] = useState('');

  const counts = useMemo(
    () => ({
      firing: statuses.filter((status) => status.state === 'firing').length,
      acked: statuses.filter((status) => status.state === 'acknowledged').length,
      silenced: statuses.filter((status) => status.state === 'silenced').length,
      events: events.length,
    }),
    [statuses, events],
  );

  const history = ruleFilter ? events.filter((event) => event.ruleId === ruleFilter) : events;
  const ruleById = (id: string) => ALERT_RULES.find((rule) => rule.id === id)!;

  return (
    <div className={styles.page}>
      <MonitorHeader
        subtitle="Rules checked every minute against the execution metrics"
        live={live}
        firing={firing}
        onToggleLive={() => setLive((value) => !value)}
        onReset={() => {
          resetMonitor();
          resetAcks();
          refresh();
        }}
      />

      <section className={cx(styles.stats, styles.stats4)} aria-label="Summary">
        {[
          { label: 'Firing', value: counts.firing, danger: counts.firing > 0 },
          { label: 'Acknowledged', value: counts.acked },
          { label: 'Silenced', value: counts.silenced },
          { label: 'Alerts in 24 hours', value: counts.events },
        ].map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <span className={cx(styles.statValue, stat.danger && styles.statDanger)}>{snap ? stat.value : '—'}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </section>

      <div className={cx(styles.card, styles.section)}>
        <h2 className={styles.cardTitle}>Rules</h2>
        {!snap ? (
          <div className={styles.empty}>Loading…</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Severity</th>
                  <th>Condition</th>
                  <th className={styles.num}>Current</th>
                  <th>State</th>
                  <th className={styles.actionsHead}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((status) => {
                  const { rule, state, event, silencedUntil } = status;
                  const stateMeta = STATE_META[state];
                  const severity = SEVERITY_META[rule.severity];
                  return (
                    <tr key={rule.id}>
                      <td className={styles.ruleCell}>
                        <span className={styles.primaryText}>{rule.name}</span>
                        <span className={styles.subText}>{rule.description}</span>
                      </td>
                      <td>
                        <span className={cx(styles.severity, styles[`tone_${severity.tone}`])}>{severity.label}</span>
                      </td>
                      <td className={cx(styles.cell, styles.monoText)}>{rule.condition}</td>
                      <td className={cx(styles.num, styles.cell, status.breaching && styles.textDanger)}>
                        <strong>{rule.format(status.value)}</strong>
                      </td>
                      <td className={styles.cell}>
                        <span className={cx(styles.badge, styles[`tone_${stateMeta.tone}`])}>{stateMeta.label}</span>
                        <span className={styles.subText}>
                          {state === 'silenced' && silencedUntil
                            ? `until ${formatClock(silencedUntil)}`
                            : event
                              ? `since ${formatAgo(event.startedAt, snap.now).replace(' ago', '')}`
                              : 'No breach'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={cx(styles.iconButton, styles.iconSuccess)}
                            aria-label={`Acknowledge ${rule.name}`}
                            title={state === 'firing' ? 'Acknowledge' : 'Nothing to acknowledge'}
                            disabled={state !== 'firing' || !event}
                            onClick={() => event && acknowledge(rule.id, event.startedAt)}
                          >
                            <Check width={15} height={15} aria-hidden="true" />
                          </button>
                          {silencedUntil ? (
                            <button
                              type="button"
                              className={cx(styles.iconButton, styles.iconPrimary)}
                              aria-label={`Unsilence ${rule.name}`}
                              title="Unsilence"
                              onClick={() => unsilence(rule.id)}
                            >
                              <Bell width={15} height={15} aria-hidden="true" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={cx(styles.iconButton, styles.iconWarn)}
                              aria-label={`Silence ${rule.name} for 1 hour`}
                              title="Silence for 1 hour"
                              onClick={() => silence(rule.id, 60)}
                            >
                              <BellOff width={15} height={15} aria-hidden="true" />
                            </button>
                          )}
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

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>History · last 24 hours</h2>
          <select className={cx(styles.select, styles.selectInline)} value={ruleFilter} onChange={(event) => setRuleFilter(event.target.value)} aria-label="Filter history by rule">
            <option value="">All rules</option>
            {ALERT_RULES.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </select>
        </div>
        {!snap ? (
          <div className={styles.empty}>Loading…</div>
        ) : history.length === 0 ? (
          <div className={styles.empty}>No alerts in the last 24 hours.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={cx(styles.table, styles.compactTable)}>
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Severity</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th className={styles.num}>Peak</th>
                </tr>
              </thead>
              <tbody>
                {history.map((event) => {
                  const rule = ruleById(event.ruleId);
                  const severity = SEVERITY_META[rule.severity];
                  return (
                    <tr key={event.id}>
                      <td>
                        <span className={styles.primaryText}>{rule.name}</span>
                      </td>
                      <td>
                        <span className={cx(styles.severity, styles[`tone_${severity.tone}`])}>{severity.label}</span>
                      </td>
                      <td className={styles.cell}>
                        {formatClock(event.startedAt)}
                        <span className={styles.subText}>{formatAgo(event.startedAt, snap.now)}</span>
                      </td>
                      <td className={styles.cell}>
                        {event.resolvedAt ? (
                          formatDuration(event.resolvedAt - event.startedAt)
                        ) : (
                          <span className={cx(styles.badge, styles.tone_danger)}>Ongoing</span>
                        )}
                      </td>
                      <td className={cx(styles.num, styles.cell)}>{rule.format(event.peak)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}