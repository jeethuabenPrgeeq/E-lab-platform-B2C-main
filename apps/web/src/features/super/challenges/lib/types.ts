export type ChallengeKind = 'weekly' | 'monthly' | 'hiring' | 'sponsored';
export type ChallengeAccess = 'everyone' | 'paid';
export type ChallengeStatus = 'draft' | 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface LeaderboardEntry {
  name: string;
  institution: string;
  score: number;
  solved: number;
  minutes: number;
}

export interface ChallengeActivity {
  at: number;
  text: string;
  actor: string;
}

export interface Challenge {
  id: string;
  title: string;
  kind: ChallengeKind;
  sponsor: string | null;
  startAt: number;
  endAt: number;
  problems: string[];
  registered: number;
  participants: number;
  prize: number;
  access: ChallengeAccess;
  published: boolean;
  cancelled: boolean;
  cancelReason: string | null;
  leaderboard: LeaderboardEntry[];
  activity: ChallengeActivity[];
}

export interface ChallengeInput {
  title: string;
  kind: ChallengeKind;
  sponsor: string | null;
  startAt: number;
  durationMinutes: number;
  problems: string[];
  prize: number;
  access: ChallengeAccess;
}
