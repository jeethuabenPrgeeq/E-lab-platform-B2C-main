export type ExecKind = 'run' | 'submit';
export type Outcome = 'ok' | 'wrong' | 'tle' | 'mle' | 're' | 'ce' | 'sandbox';
export type Range = '15m' | '1h' | '6h' | '24h';

export interface Execution {
  id: string;
  kind: ExecKind;
  problem: string;
  language: string;
  learner: string;
  worker: string;
  startedAt: number;
  durationMs: number;
  memoryMb: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  exitCode: number | null;
  outcome: Outcome;
  testsPassed: number;
  testsTotal: number;
  stdout: string;
  stderr: string;
}

export interface LangStat {
  count: number;
  failures: number;
  timed: number;
  durationSum: number;
}

export interface MinuteBucket {
  t: number;
  count: number;
  outcomes: Record<Outcome, number>;
  durations: number[];
  languages: Record<string, LangStat>;
}

export interface MonitorSnapshot {
  minutes: MinuteBucket[];
  recent: Execution[];
  now: number;
  epoch: number;
}

export interface RangeBucket {
  t: number;
  count: number;
  perMinute: number;
  p50: number;
  p95: number;
}

export type AlertSeverity = 'warning' | 'critical';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  threshold: number;
  condition: string;
  format: (value: number) => string;
  windowMin: number;
  evaluate: (window: MinuteBucket[]) => number;
  compare: 'above' | 'below';
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  startedAt: number;
  resolvedAt: number | null;
  peak: number;
}