import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { INSTITUTION_PERMISSIONS, type InstitutionPermission } from '../access/permissions.js';


export const STAFF_LEVELS = [1, 2] as const;

export class InviteStaffDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsEmail() @MaxLength(160) email!: string;
  @IsString() @MinLength(2) @MaxLength(60) title!: string;
  @IsIn(STAFF_LEVELS) level!: number;
  @IsArray() @ArrayMaxSize(INSTITUTION_PERMISSIONS.length) @IsIn(INSTITUTION_PERMISSIONS, { each: true }) permissions!: InstitutionPermission[];
  @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) groupIds!: string[];
}

export class UpdateStaffDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) title?: string;
  @IsOptional() @IsIn(STAFF_LEVELS) level?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(INSTITUTION_PERMISSIONS.length) @IsIn(INSTITUTION_PERMISSIONS, { each: true }) permissions?: InstitutionPermission[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) groupIds?: string[];
}

export class StaffReasonDto {
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
}