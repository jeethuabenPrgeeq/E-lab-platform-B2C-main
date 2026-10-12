import type { AlertRule, Metric, RuntimeRow, ServiceHealth } from '../types';

export interface PlatformAdminDashboardData {
  queueTrend: { labels: string[]; values: number[]; threshold: number };
  updatedAt: string;
  services: ServiceHealth[];
  judge: Metric[];
  outcomes: Metric[];
  runtimes: RuntimeRow[];
  alerts: AlertRule[];
  pipeline: Metric[];
}

export const platformAdminDashboard: PlatformAdminDashboardData = {
  updatedAt: '01 Oct 2026, 10:30 IST',
  queueTrend: {
    labels: ['23:00', '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00'],
    values: [120, 140, 135, 180, 210, 260, 300, 340, 420, 480, 560, 612],
    threshold: 500,
  },
  services: [
    { key: 'judge', label: 'Judge', state: 'degraded' },
    { key: 'api', label: 'API', state: 'healthy' },
    { key: 'database', label: 'Database', state: 'healthy' },
    { key: 'redis', label: 'Redis', state: 'healthy' },
    { key: 'docker', label: 'Docker', state: 'healthy' },
    { key: 'runtime', label: 'Runtime', state: 'healthy' },
  ],
  judge: [
    { key: 'executionsPerMin', label: 'Executions / min', value: 184, tone: 'primary' },
    { key: 'queuedJobs', label: 'Queued jobs', value: 612, tone: 'danger' },
    { key: 'avgExecutionTime', label: 'Avg execution time', value: 1.8, format: 'duration-s', tone: 'success' },
    { key: 'containerStartup', label: 'Container startup', value: 420, format: 'duration-ms', tone: 'neutral' },
  ],
  outcomes: [
    { key: 'successfulRuns', label: 'Successful runs', value: 86150, tone: 'success' },
    { key: 'compilationFailures', label: 'Compilation failures', value: 2640, tone: 'warning' },
    { key: 'runtimeFailures', label: 'Runtime failures', value: 512, tone: 'warning' },
    { key: 'timeouts', label: 'Timeouts', value: 236, tone: 'warning' },
    { key: 'internalErrors', label: 'Internal errors', value: 72, tone: 'danger' },
    { key: 'maxExecutionTime', label: 'Max execution time', value: 9.6, format: 'duration-s' },
  ],
  runtimes: [
    { key: 'c', runtime: 'C', state: 'healthy', executions: 12840, failureRate: 0.4 },
    { key: 'cpp', runtime: 'C++', state: 'healthy', executions: 11340, failureRate: 0.5 },
    { key: 'javascript', runtime: 'JavaScript', state: 'healthy', executions: 18200, failureRate: 0.2 },
    { key: 'typescript', runtime: 'TypeScript', state: 'healthy', executions: 9400, failureRate: 0.3 },
    { key: 'python', runtime: 'Python', state: 'healthy', executions: 22500, failureRate: 0.2 },
    { key: 'django', runtime: 'Django', state: 'healthy', executions: 2180, failureRate: 0.7 },
    { key: 'react', runtime: 'React', state: 'healthy', executions: 7220, failureRate: 0.5 },
    { key: 'nextjs', runtime: 'Next.js', state: 'healthy', executions: 3100, failureRate: 0.8 },
    { key: 'nestjs', runtime: 'NestJS', state: 'healthy', executions: 2830, failureRate: 0.6 },
  ],
  alerts: [
    { key: 'judgeQueue', label: 'Judge queue > 500', active: true },
    { key: 'pythonFailureRate', label: 'Python failure rate > 5%', active: false },
    { key: 'djangoImage', label: 'Django image unavailable', active: false },
    { key: 'avgRuntime', label: 'Average runtime > 5 seconds', active: false },
    { key: 'dockerUnavailable', label: 'Docker unavailable', active: false },
    { key: 'judgeOffline', label: 'Judge service offline', active: false },
  ],
  pipeline: [
    { key: 'draft', label: 'Draft', value: 42 },
    { key: 'underReview', label: 'Under review', value: 18, tone: 'primary' },
    { key: 'validationFailed', label: 'Validation failed', value: 7, tone: 'danger' },
    { key: 'readyToPublish', label: 'Ready to publish', value: 11, tone: 'success' },
    { key: 'published', label: 'Published', value: 486, tone: 'success' },
    { key: 'deprecated', label: 'Deprecated', value: 9 },
  ],
};