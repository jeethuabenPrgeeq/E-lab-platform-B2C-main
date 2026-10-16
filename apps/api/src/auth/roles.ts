export type AppRole = 'learner' | 'platform-admin' | 'super-admin' | 'institute-admin';

export function toAppRole(role: string): AppRole {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'super-admin';
    case 'PLATFORM_ADMIN':
      return 'platform-admin';
    case 'INSTITUTE_ADMIN':
      return 'institute-admin';
    default:
      return 'learner';
  }
}