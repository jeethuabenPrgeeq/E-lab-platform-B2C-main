export type AppRole = 'learner' | 'platform-admin' | 'super-admin';

export function toAppRole(role: string): AppRole {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'super-admin';
    case 'PLATFORM_ADMIN':
      return 'platform-admin';
    default:
      return 'learner';
  }
}