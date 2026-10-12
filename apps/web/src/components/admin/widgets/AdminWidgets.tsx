import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { formatValue } from '@/features/admin/format';
import type {
  AlertRule,
  DistributionItem,
  Metric,
  ServiceHealth,
  ServiceState,
  Tone,
  ValueFormat,
} from '@/features/admin/types';
import styles from './widgets.module.css';

type IconMap = Partial<Record<string, LucideIcon>>;

const TONE_CLASS: Record<Tone, string> = {
  neutral: styles.toneNeutral,
  primary: styles.tonePrimary,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
};

const STATE_TONE: Record<ServiceState, Tone> = {
  healthy: 'success',
  degraded: 'warning',
  down: 'danger',
};

const STATE_LABEL: Record<ServiceState, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface PageHeaderProps {
  title: string;
  pill?: string;
  meta?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, pill, meta, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerText}>
        <h1 className={styles.title}>{title}</h1>
        {(pill || meta) && (
          <div className={styles.headerMeta}>
            {pill && <span className={styles.pill}>{pill}</span>}
            {meta && <span>{meta}</span>}
          </div>
        )}
      </div>
      {actions && <div className={styles.headerActions}>{actions}</div>}
    </header>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
}

export function Section({ title, children }: SectionProps) {
  const headingId = `section-${toSlug(title)}`;
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.sectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

interface MetricStripProps {
  label: string;
  items: Metric[];
  icons?: IconMap;
  minItemWidth?: number;
}

export function MetricStrip({ label, items, icons, minItemWidth = 190 }: MetricStripProps) {
  return (
    <section className={styles.strip} aria-label={label}>
      <dl className={styles.stripGrid} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))` }}>
        {items.map((item) => {
          const Icon = icons?.[item.key];
          return (
            <div key={item.key} className={cx(styles.stripItem, TONE_CLASS[item.tone ?? 'neutral'])}>
              {Icon && (
                <span className={styles.iconTile} aria-hidden="true">
                  <Icon width={20} height={20} />
                </span>
              )}
              <div className={styles.stripText}>
                <dt className={styles.metricLabel}>{item.label}</dt>
                <dd className={styles.metricValue}>{formatValue(item.value, item.format)}</dd>
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

interface StatCardProps {
  metric: Metric;
  icon?: LucideIcon;
}

export function StatCard({ metric, icon: Icon }: StatCardProps) {
  return (
    <article className={cx(styles.card, styles.statCard, TONE_CLASS[metric.tone ?? 'neutral'])}>
      {Icon && (
        <span className={styles.iconTile} aria-hidden="true">
          <Icon width={20} height={20} />
        </span>
      )}
      <div className={styles.statText}>
        <p className={styles.statValue}>{formatValue(metric.value, metric.format)}</p>
        <p className={styles.metricLabel}>{metric.label}</p>
      </div>
    </article>
  );
}

interface PanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, subtitle, action, className, children }: PanelProps) {
  const headingId = `panel-${toSlug(title)}`;
  return (
    <section className={cx(styles.card, styles.panel, className)} aria-labelledby={headingId}>
      <div className={styles.panelHeader}>
        <div>
          <h3 id={headingId} className={styles.panelTitle}>
            {title}
          </h3>
          {subtitle && <p className={styles.panelSubtitle}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

interface SubheadingProps {
  children: ReactNode;
}

export function Subheading({ children }: SubheadingProps) {
  return <h4 className={styles.subheading}>{children}</h4>;
}

interface MetricGridProps {
  items: Metric[];
  minTileWidth?: number;
}

export function MetricGrid({ items, minTileWidth = 150 }: MetricGridProps) {
  return (
    <dl className={styles.metricGrid} style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minTileWidth}px, 1fr))` }}>
      {items.map((item) => (
        <div key={item.key} className={cx(styles.metricTile, TONE_CLASS[item.tone ?? 'neutral'])}>
          <dt className={styles.metricLabel}>{item.label}</dt>
          <dd className={styles.metricValue}>{formatValue(item.value, item.format)}</dd>
        </div>
      ))}
    </dl>
  );
}

interface DistributionBarsProps {
  items: DistributionItem[];
  format?: ValueFormat;
}

export function DistributionBars({ items, format = 'number' }: DistributionBarsProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <ul className={styles.distribution}>
      {items.map((item) => {
        const share = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <li key={item.key} className={cx(styles.distRow, TONE_CLASS[item.tone ?? 'primary'])}>
            <span className={styles.distLabel}>{item.label}</span>
            <span className={styles.distValue}>
              {formatValue(item.value, format)}
              <span className={styles.distShare}>{share.toFixed(1)}%</span>
            </span>
            <span className={styles.track} aria-hidden="true">
              <span className={styles.fill} style={{ width: `${Math.max(share, item.value > 0 ? 1.5 : 0)}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

interface ValueListProps {
  items: Metric[];
}

export function ValueList({ items }: ValueListProps) {
  return (
    <dl className={styles.valueList}>
      {items.map((item) => (
        <div key={item.key} className={cx(styles.valueRow, TONE_CLASS[item.tone ?? 'neutral'])}>
          <dt className={styles.valueLabel}>{item.label}</dt>
          <dd className={styles.valueAmount}>{formatValue(item.value, item.format)}</dd>
        </div>
      ))}
    </dl>
  );
}

interface StatusBadgeProps {
  state: ServiceState;
}

export function StatusBadge({ state }: StatusBadgeProps) {
  return (
    <span className={cx(styles.status, TONE_CLASS[STATE_TONE[state]])}>
      <span className={styles.statusDot} aria-hidden="true" />
      {STATE_LABEL[state]}
    </span>
  );
}

interface ServiceGridProps {
  label: string;
  items: ServiceHealth[];
  icons?: IconMap;
}

export function ServiceGrid({ label, items, icons }: ServiceGridProps) {
  return (
    <ul className={styles.serviceGrid} aria-label={label}>
      {items.map((item) => {
        const Icon = icons?.[item.key];
        return (
          <li key={item.key} className={cx(styles.card, styles.serviceTile, item.state !== 'healthy' && styles.serviceTileAlert)}>
            <span className={styles.serviceHead}>
              {Icon && <Icon width={18} height={18} aria-hidden="true" />}
              <span className={styles.serviceLabel}>{item.label}</span>
            </span>
            <StatusBadge state={item.state} />
          </li>
        );
      })}
    </ul>
  );
}

interface AlertListProps {
  items: AlertRule[];
}

export function AlertList({ items }: AlertListProps) {
  const sorted = [...items].sort((a, b) => Number(b.active) - Number(a.active));
  return (
    <ul className={styles.alertList}>
      {sorted.map((item) => (
        <li key={item.key} className={cx(styles.alertItem, item.active && styles.alertItemActive)}>
          <span>{item.label}</span>
          <span className={cx(styles.status, TONE_CLASS[item.active ? 'danger' : 'success'])}>
            <span className={styles.statusDot} aria-hidden="true" />
            {item.active ? 'Firing' : 'OK'}
          </span>
        </li>
      ))}
    </ul>
  );
}