import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';

export const TEMPLATE_IDS = ['revenue', 'gst', 'payments', 'churn', 'subscriptions', 'coupons', 'institutions', 'users', 'content'] as const;
export const RANGES = ['7d', '30d', 'this_month', 'last_month', '90d'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];
export type RangeId = (typeof RANGES)[number];

export class GenerateReportDto {
  @IsIn(TEMPLATE_IDS) templateId!: TemplateId;
  @IsOptional() @IsIn(RANGES) range?: RangeId;
}

export class ScheduleInputDto {
  @IsIn(TEMPLATE_IDS) templateId!: TemplateId;
  @IsIn(['weekly', 'monthly']) frequency!: 'weekly' | 'monthly';
  @Type(() => Number) @IsInt() @Min(0) @Max(6) weekday!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(28) dayOfMonth!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(23) hour!: number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @IsEmail({}, { each: true }) recipients!: string[];
}

export class ScheduleActiveDto {
  @IsBoolean() active!: boolean;
}

export class RunQueryDto extends PageQueryDto {}