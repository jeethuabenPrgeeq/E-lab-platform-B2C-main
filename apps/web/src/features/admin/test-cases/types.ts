export type Difficulty = 'easy' | 'medium' | 'hard';
export type Visibility = 'sample' | 'hidden';
export type CheckStatus = 'pass' | 'fail';

export interface TestCaseItem {
  id: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
  enabled: boolean;
  position: number;
}

export interface TestCaseInput {
  input: string;
  expectedOutput: string;
  hidden: boolean;
}

export interface CoverageRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  technology: string;
  difficulty: Difficulty;
  sampleTests: number;
  hiddenTests: number;
}

export interface ProblemTestsInfo {
  id: string;
  slug: string;
  title: string;
  status: string;
  version: number;
  difficulty: Difficulty;
  technology: { id: string; name: string; slug: string };
  hasReferenceSolution: boolean;
}

export interface CheckResult {
  testId: string;
  status: CheckStatus;
  durationMs: number;
}

export interface CheckRun {
  problemId: string;
  checkedAt: string;
  results: CheckResult[];
}