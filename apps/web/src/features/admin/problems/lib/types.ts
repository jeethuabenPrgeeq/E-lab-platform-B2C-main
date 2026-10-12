export type ProblemStatus = 'draft' | 'review' | 'ready' | 'published' | 'deprecated';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ProblemAction = 'submit' | 'approve' | 'sendBack' | 'publish' | 'moveBack' | 'unpublish' | 'deprecate';

export interface ProblemInput {
  title: string;
  technologyId: string;
  difficulty: Difficulty;
  shortDescription: string;
  problemStatement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  skills: string[];
  estimatedMinutes: number;
}

export interface TechnologyRef {
  id: string;
  slug: string;
  name: string;
  status: string;
}

export interface ProblemItem {
  id: string;
  slug: string;
  title: string;
  technology: TechnologyRef;
  difficulty: Difficulty;
  status: ProblemStatus;
  version: number;
  sampleTests: number;
  hiddenTests: number;
  reviewNote: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface NextAction {
  action: ProblemAction;
  label: string;
  needsNote: boolean;
  blockers: string[];
}

export interface PersonRef {
  id: string;
  name: string;
}

export interface ProblemDetail extends ProblemItem {
  shortDescription: string;
  problemStatement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  skills: string[];
  estimatedMinutes: number;
  createdBy: PersonRef | null;
  updatedBy: PersonRef | null;
  publishedBy: PersonRef | null;
  versionCount: number;
  nextActions: NextAction[];
}

export interface ProblemVersion {
  id: string;
  version: number;
  reason: string;
  createdAt: string;
  changedBy: PersonRef | null;
}
