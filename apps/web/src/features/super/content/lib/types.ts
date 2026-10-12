export type ContentType = 'problem' | 'project' | 'lab';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type AccessTier = 'free' | 'starter' | 'professional' | 'premium';
export type Visibility = 'listed' | 'hidden' | 'retired';

export interface ContentActivity {
  at: number;
  text: string;
  actor: string;
}

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  technology: string;
  difficulty: Difficulty;
  tier: AccessTier;
  visibility: Visibility;
  featured: boolean;
  minutes: number;
  learners: number;
  completion: number;
  rating: number;
  ratings: number;
  openReports: number;
  publishedAt: number;
  updatedAt: number;
  visibilityReason: string | null;
  activity: ContentActivity[];
}
