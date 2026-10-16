import type { InstitutionPermissionKey } from '../../access/lib/types';

export type InstitutionType = 'university' | 'college' | 'corporate' | 'skill_academy' | 'bootcamp' | 'ngo' | 'government';
export type InstitutionStatus = 'active' | 'suspended';
export type InstituteAdminStatus = 'active' | 'invited' | 'revoked';

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

export interface InstitutionDetail extends Omit<InstitutionSummary, 'admins' | 'problems'> {
  createdBy: string;
  updatedAt: number;
  admins: InstituteAdmin[];
  problemsByStatus: Record<string, number>;
}

export interface CreateInstitutionInput {
  name: string;
  code: string;
  type: InstitutionType;
  contactEmail?: string;
  permissions: InstitutionPermissionKey[];
}

export interface UpdateInstitutionInput {
  name?: string;
  type?: InstitutionType;
  contactEmail?: string;
  status?: InstitutionStatus;
}
