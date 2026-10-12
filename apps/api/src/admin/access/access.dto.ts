import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';
import { PERMISSIONS, type Permission } from './permissions.js';

export class AdminQueryDto extends PageQueryDto {
  @IsOptional() @IsString() @MaxLength(60) roleId?: string;
  @IsOptional() @IsIn(['active', 'invited', 'revoked']) status?: 'active' | 'invited' | 'revoked';
}

export class InviteAdminDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsEmail() @MaxLength(160) email!: string;
  @IsString() @MaxLength(60) roleId!: string;
  @IsOptional() @IsString() @MaxLength(120) scope?: string;
}

export class SetRoleDto {
  @IsString() @MaxLength(60) roleId!: string;
}

export class SetScopeDto {
  @IsString() @MinLength(2) @MaxLength(120) scope!: string;
}

export class RevokeDto {
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
}

export class CreateRoleDto {
  @IsString() @MinLength(2) @MaxLength(40) name!: string;
  @IsString() @MaxLength(200) description!: string;
  @IsOptional() @IsString() @MaxLength(60) copyFrom?: string | null;
}

export class SavePermissionsDto {
  @IsArray() @ArrayMaxSize(PERMISSIONS.length) @IsIn(PERMISSIONS, { each: true }) permissions!: Permission[];
}