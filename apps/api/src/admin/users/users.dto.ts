import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';

export const ROLES = ['learner', 'platform-admin', 'super-admin', 'content-manager'] as const;
export const STATUSES = ['active', 'suspended', 'deactivated'] as const;
export type RoleKey = (typeof ROLES)[number];
export type StatusKey = (typeof STATUSES)[number];

export class UserQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(ROLES)
  role?: RoleKey;

  @IsOptional()
  @IsIn(STATUSES)
  status?: StatusKey;
}

export class CreateUserDto {
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsIn(ROLES)
  role!: RoleKey;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: RoleKey;
}

export class UserStatusDto {
  @IsIn(STATUSES)
  status!: StatusKey;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}