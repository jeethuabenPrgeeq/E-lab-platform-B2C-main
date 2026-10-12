export type WorkerStatus = 'online' | 'draining' | 'restarting' | 'offline';
export type JobState = 'queued' | 'running' | 'failed';
export type Priority = 'normal' | 'high';

export interface JudgeWorker {
  id: string;
  name: string;
  host: string;
  capacity: number;
  running: number;
  cpu: number;
  memory: number;
  version: string;
  status: WorkerStatus;
  heartbeatAt: string;
}

export interface WorkerInput {
  name: string;
  host: string;
  capacity: number;
  version: string;
}

export interface JudgeJob {
  id: string;
  problem: string;
  language: string;
  learner: string;
  state: JobState;
  priority: Priority;
  workerId: string;
  queuedAt: string;
  startedAt: string;
  error: string;
}

export interface JudgeLimits {
  timeLimitMs: number;
  compileTimeoutMs: number;
  memoryLimitMb: number;
  outputLimitKb: number;
  maxProcesses: number;
  maxConcurrentPerLearner: number;
  submissionsPerMinute: number;
  networkAccess: boolean;
  sandboxProfile: 'strict' | 'standard' | 'relaxed';
}

export interface JudgeState {
  workers: JudgeWorker[];
  jobs: JudgeJob[];
  limits: JudgeLimits;
  queuePaused: boolean;
}