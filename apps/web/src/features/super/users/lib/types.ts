export type UserRole = 'learner' | 'instructor' | 'institution_admin';
export type UserStatus = 'active' | 'trial' | 'invited' | 'suspended' | 'deactivated';
export type UserPlan = 'free' | 'starter' | 'professional' | 'premium' | 'enterprise';
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

export interface UserActivity {
  at: number;
  text: string;
  actor: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  plan: UserPlan;
  cycle: BillingCycle | null;
  institution: string;
  joinedAt: number;
  lastActiveAt: number | null;
  solved: number;
  submissions: number;
  streak: number;
  suspendReason: string | null;
  activity: UserActivity[];
}

export interface InviteInput {
  emails: string[];
  role: UserRole;
  institution: string;
  plan: UserPlan;
}
