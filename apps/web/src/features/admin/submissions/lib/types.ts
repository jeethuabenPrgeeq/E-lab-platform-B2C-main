export type Verdict = 'ac' | 'wa' | 'tle' | 'mle' | 're' | 'ce';
export type DisplayVerdict = Verdict | 'judging';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SubRange = '24h' | '7d' | '30d';

export interface ProblemDef {
  id: string;
  title: string;
  difficulty: Difficulty;
  baseAc: number;
  tests: number;
  weight: number;
  fn: string;
}

export interface LanguageDef {
  name: string;
  factor: number;
  memMb: number;
  weight: number;
}

export interface Submission {
  id: string;
  t: number;
  problem: number;
  language: number;
  learner: string;
  verdict: Verdict;
  trueVerdict: Verdict;
  broken: boolean;
  testsPassed: number;
  testsTotal: number;
  runtimeMs: number;
  memoryMb: number;
  attempt: number;
  similarity: number;
  seed: number;
}

export interface Override {
  verdict: Verdict;
  from: Verdict;
  jobId: string;
  at: number;
}

export type FlagDecision = 'confirmed' | 'dismissed';

export type RejudgeScope = 'all' | 'since' | 'failed';

export interface RejudgeJob {
  id: string;
  problem: number;
  scope: RejudgeScope;
  since: number | null;
  cutoff: number;
  total: number;
  startedAt: number;
  durationMs: number;
  status: 'running' | 'done' | 'cancelled';
  finishedAt: number | null;
  changes: Record<string, number>;
}

export interface PersistState {
  overrides: Record<string, Override>;
  flags: Record<string, { decision: FlagDecision; at: number }>;
  jobs: RejudgeJob[];
  fixedAt: Record<string, number>;
}

export interface TestResult {
  index: number;
  sample: boolean;
  status: 'pass' | 'fail' | 'skipped';
  timeMs: number;
  memoryMb: number;
}