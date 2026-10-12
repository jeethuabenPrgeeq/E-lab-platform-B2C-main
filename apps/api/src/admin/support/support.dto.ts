import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';

export const TICKET_STATUSES = ['new', 'open', 'pending', 'resolved'] as const;
export const PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;
export const CATEGORIES = ['billing', 'refund', 'plan', 'account', 'certificate', 'institution', 'technical', 'other'] as const;

export type TicketStatusKey = (typeof TICKET_STATUSES)[number];
export type PriorityKey = (typeof PRIORITIES)[number];
export type CategoryKey = (typeof CATEGORIES)[number];

export class TicketQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(['all', 'unresolved', ...TICKET_STATUSES]) tab?: 'all' | 'unresolved' | TicketStatusKey;
  @IsOptional() @IsIn(PRIORITIES) priority?: PriorityKey;
  @IsOptional() @IsIn(CATEGORIES) category?: CategoryKey;
  @IsOptional() @IsIn(['sla', 'newest', 'updated']) sort?: 'sla' | 'newest' | 'updated';
  @IsOptional() @IsIn(['customer', 'platform_admin']) source?: 'customer' | 'platform_admin';
  @IsOptional() @IsIn(['me', 'none']) assignee?: 'me' | 'none';
}

export class ReplyDto {
  @IsString() @MinLength(1) @MaxLength(5000) body!: string;
  @IsIn(['open', 'pending', 'resolved']) then!: 'open' | 'pending' | 'resolved';
}

export class NoteDto {
  @IsString() @MinLength(1) @MaxLength(5000) body!: string;
}

export class TicketStatusDto {
  @IsIn(TICKET_STATUSES) status!: TicketStatusKey;
}

export class TicketPriorityDto {
  @IsIn(PRIORITIES) priority!: PriorityKey;
}

export class AssignDto {
  @IsOptional() @IsString() @MaxLength(40) assigneeId?: string | null;
}

export class CreateTicketDto {
  @IsString() @MinLength(5) @MaxLength(160) subject!: string;
  @IsIn(CATEGORIES) category!: CategoryKey;
  @IsString() @MinLength(10) @MaxLength(5000) body!: string;
  @IsOptional() @IsString() @MaxLength(120) org?: string;
}

export class EscalateDto {
  @IsString() @MinLength(5) @MaxLength(160) subject!: string;
  @IsString() @MinLength(10) @MaxLength(5000) body!: string;
  @IsIn(PRIORITIES) priority!: PriorityKey;
  @IsOptional() @IsIn(CATEGORIES) category?: CategoryKey;
}