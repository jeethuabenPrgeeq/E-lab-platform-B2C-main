export type AppRole = 'learner' | 'platform-admin' | 'super-admin' | 'content-manager';

export function toAppRole(role: string): AppRole {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'super-admin';
    case 'PLATFORM_ADMIN':
      return 'platform-admin';
    case 'CONTENT_MANAGER':
      return 'content-manager';
    default:
      return 'learner';
  }
}