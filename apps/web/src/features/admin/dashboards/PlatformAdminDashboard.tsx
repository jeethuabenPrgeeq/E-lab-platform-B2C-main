'use client';

import { useEffect, useState } from 'react';
import { Activity, Boxes, Container, Cpu, Database, Hourglass, ListOrdered, Server, Timer, Zap } from 'lucide-react';
import { TrendChart } from '@/components/admin/charts/Charts';
import {
  AlertList,
  MetricGrid,
  MetricStrip,
  PageHeader,
  Panel,
  Section,
  ServiceGrid,
  StatusBadge,
} from '@/components/admin/widgets/AdminWidgets';
import { formatValue } from '@/features/admin/format';
import { adminApi, errorText } from '@/features/admin/lib/api';
import type { PlatformAdminDashboardData } from '@/features/admin/mock/platform-admin-dashboard';
import styles from './PlatformAdminDashboard.module.css';

const FAILURE_RATE_ALERT = 5;

const SERVICE_ICONS = {
  judge: Cpu,
  api: Server,
  database: Database,
  redis: Zap,
  docker: Container,
  runtime: Boxes,
};

const JUDGE_ICONS = {
  executionsPerMin: Activity,
  queuedJobs: ListOrdered,
  avgExecutionTime: Timer,
  containerStartup: Hourglass,
};

const REFRESH_MS = 30_000;

export function PlatformAdminDashboard() {
  const [data, setData] = useState<PlatformAdminDashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () =>
      adminApi<PlatformAdminDashboardData>('/admin/platform/dashboard')
        .then((next) => {
          if (!alive) return;
          setData(next);
          setError('');
        })
        .catch((err) => {
          if (alive) setError(errorText(err));
        });
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!data) {
    return (
      <div className={styles.page}>
        <PageHeader title="Technical Dashboard" pill="Technical operations" meta={error || 'Loading live data…'} />
      </div>
    );
  }

  return <DashboardView data={data} error={error} />;
}

function DashboardView({ data, error }: { data: PlatformAdminDashboardData; error: string }) {
  const firingAlerts = data.alerts.filter((alert) => alert.active).length;
  const totalExecutions = data.runtimes.reduce((sum, row) => sum + row.executions, 0);
  const weightedFailure =
    totalExecutions > 0
      ? data.runtimes.reduce((sum, row) => sum + row.executions * row.failureRate, 0) / totalExecutions
      : 0;

  return (
    <div className={styles.page}>
      <PageHeader title="Technical Dashboard" pill="Technical operations" meta={error ? `Showing data from ${data.updatedAt} · ${error}` : `Updated ${data.updatedAt}`} />

      <Section title="Service health">
        <ServiceGrid label="Service health" items={data.services} icons={SERVICE_ICONS} />
      </Section>

      <Section title="Judge monitoring">
        <MetricStrip label="Judge throughput" items={data.judge} icons={JUDGE_ICONS} />
        <div className={styles.split}>
          <Panel title="Judge queue" subtitle="Queued jobs, last 12 hours">
            <TrendChart
              title="Judge queue, queued jobs over the last 12 hours"
              labels={data.queueTrend.labels}
              values={data.queueTrend.values}
              threshold={{ value: data.queueTrend.threshold, label: `Alert at ${data.queueTrend.threshold}` }}
              color="#d03b3b"
            />
          </Panel>
          <Panel title="Alerts" subtitle={firingAlerts > 0 ? `${firingAlerts} firing` : 'All rules passing'}>
            <AlertList items={data.alerts} />
          </Panel>
        </div>
      </Section>

      <div className={styles.halves}>
        <Panel title="Runtime health" subtitle="Per-runtime executions and failure rate">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Runtime</th>
                  <th scope="col">Status</th>
                  <th scope="col" className={styles.num}>
                    Executions
                  </th>
                  <th scope="col" className={styles.num}>
                    Failure rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.runtimes.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className={styles.rowHead}>
                      {row.runtime}
                    </th>
                    <td>
                      <StatusBadge state={row.state} />
                    </td>
                    <td className={styles.num}>{formatValue(row.executions)}</td>
                    <td className={`${styles.num} ${row.failureRate > FAILURE_RATE_ALERT ? styles.rateAlert : ''}`}>
                      {formatValue(row.failureRate, 'percent')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">All runtimes</th>
                  <td />
                  <td className={styles.num}>{formatValue(totalExecutions)}</td>
                  <td className={styles.num}>{formatValue(weightedFailure, 'percent')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
        <div className={styles.sideStack}>
          <Panel title="Run outcomes" subtitle="Execution results across all runtimes" className={styles.grow}>
            <MetricGrid items={data.outcomes} />
          </Panel>
          <Panel title="Problem pipeline" subtitle="Problems by lifecycle stage" className={styles.grow}>
            <MetricGrid items={data.pipeline} />
          </Panel>
        </div>
      </div>
    </div>
  );
}