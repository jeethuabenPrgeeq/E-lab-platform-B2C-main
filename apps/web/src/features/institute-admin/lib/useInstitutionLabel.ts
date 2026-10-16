'use client';

import { usePermissions } from '@/features/admin/permissions/PermissionsProvider';

export function useInstitutionLabel() {
  const { institution } = usePermissions();
  return institution?.name ?? 'Institute Admin';
}

export const SCOPE_OPTIONS = [
  { value: 'all', label: 'All problems' },
  { value: 'created', label: 'Created by me' },
  { value: 'assigned', label: 'Assigned to me' },
] as const;
