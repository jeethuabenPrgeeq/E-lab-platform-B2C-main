import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { INSTITUTION_PERMISSIONS, type InstitutionPermission } from '../access/permissions.js';
import { PageQueryDto } from '../common/pagination.js';

export const INSTITUTION_TYPES = ['university', 'college', 'corporate', 'skill_academy', 'bootcamp', 'ngo', 'government'] as const;
export const INSTITUTION_STATUSES = ['active', 'suspended'] as const;

export type InstitutionType = (typeof INSTITUTION_TYPES)[number];
export type InstitutionStatus = (typeof INSTITUTION_STATUSES)[number];

export const STAFF_LEVEL_OPTIONS = [0, 1, 2] as const;
export const ENVIRONMENTS = ['empty', 'predefined'] as const;
export type InstitutionEnvironment = (typeof ENVIRONMENTS)[number];

export class InstitutionQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(INSTITUTION_TYPES) type?: InstitutionType;
  @IsOptional() @IsIn(INSTITUTION_STATUSES) status?: InstitutionStatus;
}

export class CreateInstitutionDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @Matches(/^[A-Za-z0-9-]{2,20}$/, { message: 'Code must be 2-20 letters, numbers or dashes.' }) code!: string;
  @IsIn(INSTITUTION_TYPES) type!: InstitutionType;
  @IsOptional() @IsEmail() @MaxLength(160) contactEmail?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(INSTITUTION_PERMISSIONS.length) @IsIn(INSTITUTION_PERMISSIONS, { each: true }) permissions?: InstitutionPermission[];
  @IsOptional() @IsIn(STAFF_LEVEL_OPTIONS) staffLevels?: number;
  @IsOptional() @IsIn(ENVIRONMENTS) environment?: InstitutionEnvironment;
}

export class UpdateInstitutionDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsIn(INSTITUTION_TYPES) type?: InstitutionType;
  @IsOptional() @IsEmail() @MaxLength(160) contactEmail?: string;
  @IsOptional() @IsIn(INSTITUTION_STATUSES) status?: InstitutionStatus;
  @IsOptional() @IsIn(STAFF_LEVEL_OPTIONS) staffLevels?: number;
}

export class SetInstitutionPermissionsDto {
  @IsArray() @ArrayMaxSize(INSTITUTION_PERMISSIONS.length) @IsIn(INSTITUTION_PERMISSIONS, { each: true }) permissions!: InstitutionPermission[];
}

export class InviteInstituteAdminDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsEmail() @MaxLength(160) email!: string;
}

export class LinkInstituteAdminDto {
  @IsString() @MaxLength(60) userId!: string;
}

export class InstituteAdminReasonDto {
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
}