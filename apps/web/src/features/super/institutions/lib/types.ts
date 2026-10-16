import type { InstitutionPermissionKey } from '../../access/lib/types';

export type InstitutionType = 'university' | 'college' | 'corporate' | 'skill_academy' | 'bootcamp' | 'ngo' | 'government';
export type InstitutionStatus = 'active' | 'suspended';
export type InstituteAdminStatus = 'active' | 'invited' | 'revoked';
export type StaffLevels = 0 | 1 | 2;
export type InstitutionEnvironment = 'empty' | 'predefined';

export interface InstitutionSummary {
  id: string;
  name: string;
  code: string;
  type: InstitutionType;
  status: InstitutionStatus;
  contactEmail: string | null;
  permissions: InstitutionPermissionKey[];
  admins: number;
  problems: number;
  learners: number;
  createdAt: number;
}

export interface InstitutionList {
  items: InstitutionSummary[];
  total: number;
  statusCounts: Partial<Record<InstitutionStatus, number>>;
  unlinkedAdmins: number;
}

export interface InstituteAdmin {
  id: string;
  name: string;
  email: string;
  status: InstituteAdminStatus;
  lastSignInAt: number | null;
  invitedBy: string;
  revokeReason: string | null;
  createdAt: number;
}

export interface LearnerRef {
  id: string;
  name: string;
  email: string;
}

export interface InstitutionDetail extends Omit<InstitutionSummary, 'admins' | 'problems' | 'learners'> {
  staffLevels: StaffLevels;
  environment: InstitutionEnvironment;
  createdBy: string;
  updatedAt: number;
  admins: InstituteAdmin[];
  problemsByStatus: Record<string, number>;
  learners: { active: number; revoked: number };
}

export interface CreateInstitutionInput {
  name: string;
  code: string;
  type: InstitutionType;
  contactEmail?: string;
  staffLevels: StaffLevels;
  environment: InstitutionEnvironment;
}

export interface UpdateInstitutionInput {
  name?: string;
  type?: InstitutionType;
  contactEmail?: string;
  status?: InstitutionStatus;
  staffLevels?: StaffLevels;
}