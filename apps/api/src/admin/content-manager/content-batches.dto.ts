import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';

export const BATCH_TYPES = ['regular_practice', 'stack_section', 'real_time_challenge'] as const;
export type BatchType = (typeof BATCH_TYPES)[number];
export const MAX_BATCH_PROBLEMS = 500;

export class BatchQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
}

export class CreateBatchDto {
  @IsString() @Length(1, 120) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(BATCH_TYPES) type?: BatchType;
  @IsOptional() @IsString() @MaxLength(120) focus?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_BATCH_PROBLEMS) easyTarget?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_BATCH_PROBLEMS) mediumTarget?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_BATCH_PROBLEMS) hardTarget?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_BATCH_PROBLEMS) @IsString({ each: true }) problemIds?: string[];
}

export class UpdateBatchDto {
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(BATCH_TYPES) type?: BatchType;
  @IsOptional() @IsString() @MaxLength(120) focus?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_BATCH_PROBLEMS) easyTarget?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_BATCH_PROBLEMS) mediumTarget?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_BATCH_PROBLEMS) hardTarget?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_BATCH_PROBLEMS) @IsString({ each: true }) problemIds?: string[];
}
