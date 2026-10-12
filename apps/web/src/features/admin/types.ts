export type AdminRole = 'super-admin' | 'platform-admin' | 'content-manager';
export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
export type ValueFormat = 'number' | 'currency' | 'percent' | 'duration-ms' | 'duration-s';

export interface Metric {
  key: string;
  label: string;
  value: number;
  format?: ValueFormat;
  tone?: Tone;
}

export interface DistributionItem {
  key: string;
  label: string;
  value: number;
  tone?: Tone;
}

export type ServiceState = 'healthy' | 'degraded' | 'down';

export interface ServiceHealth {
  key: string;
  label: string;
  state: ServiceState;
}

export interface RuntimeRow {
  key: string;
  runtime: string;
  state: ServiceState;
  executions: number;
  failureRate: number;
}

export interface AlertRule {
  key: string;
  label: string;
  active: boolean;
}