export type ReleaseStatus = 'draft' | 'scheduled' | 'rolling' | 'paused' | 'live' | 'rolled_back';
export type ReleaseType = 'feature' | 'fix' | 'hotfix' | 'runtime';
export type ChangeKind = 'added' | 'changed' | 'fixed';

export interface ReleaseChange {
  kind: ChangeKind;
  text: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ReleaseEvent {
  id: string;
  at: number;
  actor: string;
  text: string;
  tone: 'success' | 'warning' | 'danger' | 'primary' | 'neutral';
}

export interface Release {
  id: string;
  version: string;
  title: string;
  type: ReleaseType;
  status: ReleaseStatus;
  owner: string;
  stage: number;
  stageAt: number | null;
  scheduledAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
  changes: ReleaseChange[];
  checklist: ChecklistItem[];
  events: ReleaseEvent[];
}

export interface ReleaseInput {
  version: string;
  title: string;
  type: ReleaseType;
  owner: string;
  changes: ReleaseChange[];
}