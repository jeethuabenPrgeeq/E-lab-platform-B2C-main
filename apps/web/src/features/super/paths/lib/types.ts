import type { AccessTier } from '../../content/lib/types';

export type PathLevel = 'beginner' | 'intermediate' | 'advanced';
export type PathStatus = 'draft' | 'published' | 'archived';

export interface PathActivity {
  at: number;
  text: string;
  actor: string;
}

export interface LearningPath {
  id: string;
  title: string;
  summary: string;
  level: PathLevel;
  tier: AccessTier;
  status: PathStatus;
  certificate: boolean;
  steps: string[];
  enrolled: number;
  completion: number;
  createdAt: number;
  updatedAt: number;
  activity: PathActivity[];
}

export type PathDraft = Pick<LearningPath, 'title' | 'summary' | 'level' | 'tier' | 'certificate' | 'steps'>;

export interface NewPathInput {
  title: string;
  level: PathLevel;
  tier: AccessTier;
}
