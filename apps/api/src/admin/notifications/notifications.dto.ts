import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';

export const CHANNELS = ['in_app', 'email', 'push'] as const;
export const AUDIENCES = ['all', 'paid', 'free', 'trial', 'plan', 'inactive', 'institution', 'instructors'] as const;
export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'cancelled'] as const;
export type Channel = (typeof CHANNELS)[number];
export type AudienceKindKey = (typeof AUDIENCES)[number];

export class AudienceDto {
  @IsIn(AUDIENCES) kind!: AudienceKindKey;
  @IsOptional() @IsString() @MaxLength(120) value?: string | null;
}

export class CampaignInputDto {
  @IsString() @MaxLength(120) name!: string;
  @IsString() @MaxLength(160) subject!: string;
  @IsString() @MaxLength(2000) body!: string;
  @IsOptional() @IsString() @MaxLength(300) link?: string;
  @IsArray() @ArrayMaxSize(3) @IsIn(CHANNELS, { each: true }) channels!: Channel[];
  @ValidateNested() @Type(() => AudienceDto) audience!: AudienceDto;
  @IsOptional() @Type(() => Number) @IsInt() sendAt?: number | null;
  @IsIn(['draft', 'schedule', 'now']) mode!: 'draft' | 'schedule' | 'now';
}

export class CampaignQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(CAMPAIGN_STATUSES) status?: (typeof CAMPAIGN_STATUSES)[number];
}

export class AudienceQueryDto {
  @IsIn(AUDIENCES) kind!: AudienceKindKey;
  @IsOptional() @IsString() @MaxLength(120) value?: string;
}

export class CancelCampaignDto {
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
}
