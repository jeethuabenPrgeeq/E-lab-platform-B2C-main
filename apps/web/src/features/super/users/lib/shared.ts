import type { BillingCycle, PlatformUser, UserPlan, UserRole, UserStatus } from './types';

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export const ME = 'You';

export const INSTITUTIONS = ['Christ University', 'NIT Calicut', 'PES University', 'Amrita Vishwa Vidyapeetham', 'RV College of Engineering', 'Independent'];

export const ROLE_META: Record<UserRole, { label: string; plural: string }> = {
  learner: { label: 'Learner', plural: 'Learners' },
  instructor: { label: 'Instructor', plural: 'Instructors' },
  institution_admin: { label: 'Institution admin', plural: 'Institution admins' },
};

export const STATUS_META: Record<UserStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'success' },
  trial: { label: 'Trial', tone: 'warning' },
  invited: { label: 'Invited', tone: 'primary' },
  suspended: { label: 'Suspended', tone: 'danger' },
  deactivated: { label: 'Deactivated', tone: 'neutral' },
};

export const PLAN_META: Record<UserPlan, { label: string; tone: string; paid: boolean }> = {
  free: { label: 'Free', tone: 'neutral', paid: false },
  starter: { label: 'Starter', tone: 'primary', paid: true },
  professional: { label: 'Professional', tone: 'primary', paid: true },
  premium: { label: 'Premium', tone: 'success', paid: true },
  enterprise: { label: 'Enterprise', tone: 'warning', paid: true },
};

export const CYCLE_META: Record<BillingCycle, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function initials(name: string) {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatAgo(t: number | null, now: number) {
  if (!t) return 'Never';
  const minutes = Math.max(0, Math.round((now - t) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function formatDate(t: number) {
  return new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function toCsv(users: PlatformUser[]) {
  const head = ['id', 'name', 'email', 'role', 'status', 'plan', 'billing_cycle', 'institution', 'joined', 'last_active', 'problems_solved'];
  const rows = users.map((user) =>
    [
      user.id,
      user.name,
      user.email,
      ROLE_META[user.role].label,
      STATUS_META[user.status].label,
      PLAN_META[user.plan].label,
      user.cycle ? CYCLE_META[user.cycle] : '',
      user.institution,
      new Date(user.joinedAt).toISOString().slice(0, 10),
      user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : '',
      String(user.solved),
    ]
      .map(csvCell)
      .join(','),
  );
  return [head.join(','), ...rows].join('\n');
}
