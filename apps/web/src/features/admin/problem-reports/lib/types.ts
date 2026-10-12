export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'rejected';
export type ReportCategory = 'wrong_testcase' | 'wrong_output' | 'unclear_statement' | 'compiler' | 'typo' | 'other';
export type Priority = 'high' | 'medium' | 'low';
export type ResolutionType = 'fixed_testcase' | 'updated_statement' | 'fixed_runtime' | 'not_a_bug' | 'duplicate';

export interface LearnerReport {
  learner: string;
  at: number;
  message: string;
  submissionId: string | null;
  language: string;
}

export interface ActivityItem {
  at: number;
  actor: string;
  text: string;
  kind: 'status' | 'assign' | 'reply' | 'note' | 'report';
}

export interface ProblemReport {
  id: string;
  title: string;
  problem: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: ReportCategory;
  status: ReportStatus;
  assignee: string | null;
  createdAt: number;
  updatedAt: number;
  reports: LearnerReport[];
  activity: ActivityItem[];
  resolution: { type: ResolutionType; note: string; at: number } | null;
}