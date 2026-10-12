'use client';

import { useEffect, useState } from 'react';
import {
  CalendarClock,
  CircleAlert,
  Crown,
  IndianRupee,
  RotateCcw,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { ColumnChart, ShareBar, TrendChart } from '@/components/admin/charts/Charts';
import {
  MetricStrip,
  PageHeader,
  Panel,
  Section,
  StatCard,
  Subheading,
  ValueList,
} from '@/components/admin/widgets/AdminWidgets';
import { adminApi, errorText } from '@/features/admin/lib/api';
import type { SuperAdminDashboardData } from '@/features/admin/mock/super-admin-dashboard';
import styles from './SuperAdminDashboard.module.css';

const HIGHLIGHT_ICONS = {
  mrr: IndianRupee,
  paymentsToday: Wallet,
  failedPayments: CircleAlert,
  refundRequests: RotateCcw,
  renewalsDue: CalendarClock,
};

const USER_ICONS = {
  totalRegistered: Users,
  activeUsers: UserCheck,
  paidUsers: Crown,
  userGrowth: TrendingUp,
};

const PAYMENT_KEYS = new Set(['successful', 'failed', 'pending', 'outstandingInvoices']);
const REFRESH_MS = 60_000;

export function SuperAdminDashboard() {
  const [data, setData] = useState<SuperAdminDashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () =>
      adminApi<SuperAdminDashboardData>('/super/dashboard')
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
        <PageHeader title="Super Admin Dashboard" pill="Business control" meta={error || 'Loading live data…'} />
      </div>
    );
  }

  return <DashboardView data={data} error={error} />;
}

function DashboardView({ data, error }: { data: SuperAdminDashboardData; error: string }) {
  const payments = data.transactions.filter((item) => PAYMENT_KEYS.has(item.key));
  const adjustments = data.transactions.filter((item) => !PAYMENT_KEYS.has(item.key));

  return (
    <div className={styles.page}>
      <PageHeader title="Super Admin Dashboard" pill="Business control" meta={error ? `Showing data from ${data.updatedAt} · ${error}` : `Updated ${data.updatedAt}`} />

      <MetricStrip label="Billing highlights" items={data.highlights} icons={HIGHLIGHT_ICONS} />

      <Section title="Business overview">
        <div className={styles.statGrid}>
          {data.userTotals.map((metric) => (
            <StatCard key={metric.key} metric={metric} icon={USER_ICONS[metric.key as keyof typeof USER_ICONS]} />
          ))}
        </div>
        <div className={styles.split}>
          <Panel title="Monthly active users" subtitle="Last 12 months">
            <TrendChart
              title="Monthly active users, last 12 months"
              labels={data.activeUsersTrend.labels}
              values={data.activeUsersTrend.values}
            />
          </Panel>
          <Panel title="Account status" subtitle="Share of all registered users">
            <ShareBar title="Account status" items={data.accountStatus} />
          </Panel>
        </div>
        <MetricStrip label="Acquisition and engagement" items={data.engagement} minItemWidth={150} />
      </Section>

      <Section title="Subscription overview">
        <div className={styles.halves}>
          <Panel title="New vs cancelled subscriptions" subtitle="Last 6 months">
            <ColumnChart
              title="New vs cancelled subscriptions, last 6 months"
              labels={data.subscriptionFlow.labels}
              series={[
                { key: 'started', label: 'New', values: data.subscriptionFlow.started },
                { key: 'cancelled', label: 'Cancelled', values: data.subscriptionFlow.cancelled },
              ]}
            />
          </Panel>
          <Panel title="Plan distribution" subtitle="Active subscriptions by plan">
            <ShareBar title="Plan distribution" items={data.planDistribution} />
            <Subheading>Billing cycle</Subheading>
            <ShareBar title="Billing cycle" items={data.billingCycles} />
          </Panel>
        </div>
        <MetricStrip label="Subscription lifecycle" items={data.subscriptions} minItemWidth={140} />
      </Section>

      <Section title="Billing overview">
        <div className={styles.split}>
          <Panel title="Revenue" subtitle="This year, by month">
            <ColumnChart
              title="Revenue this year, by month"
              labels={data.revenueTrend.labels}
              series={[{ key: 'revenue', label: 'Revenue', values: data.revenueTrend.values }]}
              format="currency"
            />
          </Panel>
          <Panel title="Revenue summary" subtitle="Collected and recurring">
            <ValueList items={data.revenue} />
          </Panel>
        </div>
        <MetricStrip label="Payments" items={payments} minItemWidth={160} />
        <MetricStrip label="Adjustments" items={adjustments} minItemWidth={160} />
      </Section>
    </div>
  );
}