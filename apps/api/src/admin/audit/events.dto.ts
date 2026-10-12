import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';
import { CATEGORIES, SEVERITIES, type AuditCategory, type AuditSeverity } from './events.js';

export const RANGES = ['24h', '7d', '30d', '90d', 'all'] as const;
export type EventRange = (typeof RANGES)[number];

export class EventQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(CATEGORIES) category?: AuditCategory;
  @IsOptional() @IsIn(SEVERITIES) severity?: AuditSeverity;
  @IsOptional() @IsIn(['success', 'failure']) outcome?: 'success' | 'failure';
  @IsOptional() @IsString() @MaxLength(160) actor?: string;
  @IsOptional() @IsIn(RANGES) range?: EventRange;
}
