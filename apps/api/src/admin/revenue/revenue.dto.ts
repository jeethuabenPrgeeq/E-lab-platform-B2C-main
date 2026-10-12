import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';

export const PLANS = ['starter', 'professional', 'premium', 'enterprise'] as const;
export const INDIVIDUAL_PLANS = ['starter', 'professional', 'premium'] as const;
export const CYCLES = ['monthly', 'quarterly', 'annual'] as const;
export const SUB_STATUSES = ['active', 'past_due', 'cancelled'] as const;
export const METHODS = ['upi', 'card', 'netbanking', 'invoice'] as const;
export const PAYMENT_STATUSES = ['succeeded', 'failed', 'refunded', 'partially_refunded'] as const;
export const COUPON_STATUSES = ['active', 'scheduled', 'paused', 'used_up', 'expired'] as const;

export type Plan = (typeof PLANS)[number];
export type IndividualPlan = (typeof INDIVIDUAL_PLANS)[number];
export type Cycle = (typeof CYCLES)[number];

export class SubscriptionQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(PLANS) plan?: Plan;
  @IsOptional() @IsIn(SUB_STATUSES) status?: (typeof SUB_STATUSES)[number];
  @IsOptional() @IsIn(CYCLES) cycle?: Cycle;
}

export class CreateSubscriptionDto {
  @IsEmail() email!: string;
  @IsIn(PLANS) plan!: Plan;
  @IsIn(CYCLES) cycle!: Cycle;
  @IsIn(METHODS) method!: (typeof METHODS)[number];
  @IsOptional() @IsString() @MaxLength(60) methodLabel?: string;
  @IsOptional() @IsString() @MaxLength(20) coupon?: string;
  @ValidateIf((dto: CreateSubscriptionDto) => dto.plan === 'enterprise') @IsString() @MinLength(2) @MaxLength(120) institution?: string;
  @ValidateIf((dto: CreateSubscriptionDto) => dto.plan === 'enterprise') @Type(() => Number) @IsInt() @Min(5) @Max(100_000) seats?: number;
  @ValidateIf((dto: CreateSubscriptionDto) => dto.plan === 'enterprise') @Type(() => Number) @IsInt() @Min(1) @Max(100_000_000) amount?: number;
}

export class ChangePlanDto {
  @IsIn(INDIVIDUAL_PLANS) plan!: IndividualPlan;
  @IsIn(CYCLES) cycle!: Cycle;
  @IsIn(['now', 'renewal']) when!: 'now' | 'renewal';
}

export class CancelSubscriptionDto {
  @IsIn(['period_end', 'now']) mode!: 'period_end' | 'now';
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
  @IsOptional() @IsBoolean() refundUnused?: boolean;
}

export class ExtendSubscriptionDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(90) days!: number;
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
}

export class PaymentQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(PAYMENT_STATUSES) status?: (typeof PAYMENT_STATUSES)[number];
  @IsOptional() @IsIn(['pending']) refund?: 'pending';
  @IsOptional() @IsString() @MaxLength(40) subscriptionId?: string;
}

export class RefundDto {
  @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
}

export class RejectRefundDto {
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
}

export class PriceDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(1_000_000) amount!: number;
}

export class CouponQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(COUPON_STATUSES) status?: (typeof COUPON_STATUSES)[number];
}

export class CouponInputDto {
  @IsString() @MaxLength(20) code!: string;
  @IsString() @MaxLength(200) description!: string;
  @IsIn(['percent', 'fixed']) kind!: 'percent' | 'fixed';
  @Type(() => Number) @IsInt() value!: number;
  @IsArray() @ArrayMaxSize(3) @IsIn(INDIVIDUAL_PLANS, { each: true }) plans!: IndividualPlan[];
  @IsArray() @ArrayMaxSize(3) @IsIn(CYCLES, { each: true }) cycles!: Cycle[];
  @IsIn(['once', 'repeating', 'forever']) duration!: 'once' | 'repeating' | 'forever';
  @Type(() => Number) @IsInt() months!: number;
  @IsOptional() @Type(() => Number) @IsInt() maxRedemptions?: number | null;
  @IsBoolean() firstTimeOnly!: boolean;
  @Type(() => Number) @IsInt() startsAt!: number;
  @IsOptional() @Type(() => Number) @IsInt() endsAt?: number | null;
}

export class PauseCouponDto {
  @IsBoolean() paused!: boolean;
}