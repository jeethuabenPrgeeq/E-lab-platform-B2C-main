import type { InstituteAdminStatus, InstitutionStatus, InstitutionType } from './types';

export const INSTITUTION_TYPES: { value: InstitutionType; label: string }[] = [
  { value: 'university', label: 'University' },
  { value: 'college', label: 'College' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'skill_academy', label: 'Skill academy' },
  { value: 'bootcamp', label: 'Bootcamp' },
  { value: 'ngo', label: 'NGO' },
  { value: 'government', label: 'Government' },
];

export const TYPE_LABEL = Object.fromEntries(INSTITUTION_TYPES.map((item) => [item.value, item.label])) as Record<InstitutionType, string>;

export const INSTITUTION_STATUS_META: Record<InstitutionStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'danger' },
};

export const ADMIN_STATUS_META: Record<InstituteAdminStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'primary' },
  revoked: { label: 'Revoked', tone: 'neutral' },
};

export const CODE_PATTERN = /^[A-Za-z0-9-]{2,20}$/;


export const HIERARCHY_OPTIONS: { value: 0 | 1 | 2; label: string; description: string }[] = [
  { value: 0, label: '2 levels', description: 'Institute Admin → Learners' },
  { value: 1, label: '3 levels', description: 'Institute Admin → Staff → Learners' },
  { value: 2, label: '4 levels', description: 'Institute Admin → Lead staff → Staff → Learners' },
];

export const ENVIRONMENT_OPTIONS: { value: 'empty' | 'predefined'; label: string; description: string }[] = [
  { value: 'empty', label: 'Empty', description: 'Start with a blank content library' },
  { value: 'predefined', label: 'Predefined', description: 'Copy eLab’s published problems into the library, ready to use' },
];