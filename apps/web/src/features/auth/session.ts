export type UserRole = 'learner' | 'super-admin' | 'platform-admin';

export interface Session {
  email: string;
  role: UserRole;
}

export interface DemoAccount {
  email: string;
  role: UserRole;
  password: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { email: 'learner@elab.com', role: 'learner', password: process.env.NEXT_PUBLIC_DEMO_LEARNER_PASSWORD ?? '' },
  { email: 'superadmin@elab.com', role: 'super-admin', password: process.env.NEXT_PUBLIC_DEMO_SUPERADMIN_PASSWORD ?? '' },
  { email: 'platformadmin@elab.com', role: 'platform-admin', password: process.env.NEXT_PUBLIC_DEMO_PLATFORMADMIN_PASSWORD ?? '' },
];

const AUTH_KEY = 'elab_dummy_auth';
const USER_KEY = 'elab_dummy_user';
const ROLE_KEY = 'elab_dummy_role';

const ROLES: readonly UserRole[] = ['learner', 'super-admin', 'platform-admin'];

export function saveSession(session: Session) {
  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(USER_KEY, session.email);
  localStorage.setItem(ROLE_KEY, session.role);
}

export function readSession(): Session | null {
  try {
    if (localStorage.getItem(AUTH_KEY) !== 'true') return null;
    const storedRole = localStorage.getItem(ROLE_KEY) as UserRole | null;
    return {
      email: localStorage.getItem(USER_KEY) ?? '',
      role: storedRole && ROLES.includes(storedRole) ? storedRole : 'learner',
    };
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  } catch {}
}