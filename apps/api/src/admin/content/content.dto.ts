import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';

export const TIERS = ['free', 'starter', 'professional', 'premium'] as const;
export const VISIBILITIES = ['listed', 'hidden', 'retired'] as const;
export const CONTENT_TYPES = ['problem', 'project', 'lab'] as const;
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const PATH_STATUSES = ['draft', 'published', 'archived'] as const;
export const KINDS = ['weekly', 'monthly', 'hiring', 'sponsored'] as const;
export const ACCESS = ['everyone', 'paid'] as const;
export const CHALLENGE_STATUSES = ['draft', 'scheduled', 'live', 'ended', 'cancelled'] as const;

export type Tier = (typeof TIERS)[number];
export type VisibilityKey = (typeof VISIBILITIES)[number];

export class CatalogQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(CONTENT_TYPES) type?: (typeof CONTENT_TYPES)[number];
  @IsOptional() @IsString() @MaxLength(60) technology?: string;
  @IsOptional() @IsIn(TIERS) tier?: Tier;
  @IsOptional() @IsIn(VISIBILITIES) visibility?: VisibilityKey;
  @IsOptional() @IsIn(['true', 'false']) featured?: 'true' | 'false';
}

export class CatalogTierDto {
  @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) ids!: string[];
  @IsIn(TIERS) tier!: Tier;
}

export class CatalogVisibilityDto {
  @IsArray() @ArrayMaxSize(500) @IsString({ each: true }) ids!: string[];
  @IsIn(VISIBILITIES) visibility!: VisibilityKey;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class PathQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(PATH_STATUSES) status?: (typeof PATH_STATUSES)[number];
  @IsOptional() @IsIn(LEVELS) level?: (typeof LEVELS)[number];
}

export class CreatePathDto {
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @IsIn(LEVELS) level!: (typeof LEVELS)[number];
  @IsIn(TIERS) tier!: Tier;
}

export class SavePathDto {
  @IsString() @MaxLength(120) title!: string;
  @IsString() @MaxLength(1000) summary!: string;
  @IsIn(LEVELS) level!: (typeof LEVELS)[number];
  @IsIn(TIERS) tier!: Tier;
  @IsBoolean() certificate!: boolean;
  @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) steps!: string[];
}

export class PathStatusDto {
  @IsIn(['draft', 'archived']) status!: 'draft' | 'archived';
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class ChallengeQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(CHALLENGE_STATUSES) status?: (typeof CHALLENGE_STATUSES)[number];
  @IsOptional() @IsIn(KINDS) kind?: (typeof KINDS)[number];
}

export class ChallengeInputDto {
  @IsString() @MaxLength(120) title!: string;
  @IsIn(KINDS) kind!: (typeof KINDS)[number];
  @IsOptional() @IsString() @MaxLength(120) sponsor?: string | null;
  @Type(() => Number) @IsInt() startAt!: number;
  @Type(() => Number) @IsInt() @Min(15) @Max(60 * 24 * 60) durationMinutes!: number;
  @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) problems!: string[];
  @Type(() => Number) @IsInt() @Min(0) @Max(100_000_000) prize!: number;
  @IsIn(ACCESS) access!: (typeof ACCESS)[number];
  @IsOptional() @IsBoolean() publish?: boolean;
}

export class ExtendChallengeDto {
  @Type(() => Number) @IsInt() @Min(5) @Max(60 * 24 * 14) minutes!: number;
}

export class CancelChallengeDto {
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
}