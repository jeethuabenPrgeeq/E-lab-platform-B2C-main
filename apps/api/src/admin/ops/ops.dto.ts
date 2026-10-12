import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';
import { COMPONENTS, INCIDENT_STATUSES, LINK_KINDS, SEVERITIES, type ComponentId, type IncidentStatus, type Severity } from './incidents.service.js';
import { PLATFORM_CATEGORIES, PLATFORM_RANGES, type PlatformCategory, type PlatformRange } from './platform-audit.service.js';
import { REPORT_CATEGORIES, REPORT_STATUSES, RESOLUTIONS, type ReportCategory, type ResolutionType } from './problem-reports.service.js';
import { CHANGE_KINDS, RELEASE_TYPES, type ReleaseType } from './releases.service.js';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type TicketCategory, type TicketPriority, type TicketStatus } from './tech-support.service.js';

const bool = ({ value }: { value: unknown }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value);

export class AssignDto {
  @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(40) assigneeId!: string | null;
}

export class TextDto {
  @IsString() @MinLength(2) @MaxLength(5000) body!: string;
}

export class ReasonDto {
  @IsString() @MinLength(5) @MaxLength(500) reason!: string;
}

export class SubmitReportDto {
  @IsIn(REPORT_CATEGORIES) category!: ReportCategory;
  @IsString() @MinLength(10) @MaxLength(2000) message!: string;
  @IsOptional() @IsString() @MaxLength(40) submissionId?: string | null;
  @IsOptional() @IsString() @MaxLength(30) language?: string | null;
}

export class ReportQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(REPORT_STATUSES) status?: string;
  @IsOptional() @IsIn(REPORT_CATEGORIES) category?: string;
  @IsOptional() @IsIn(['high', 'medium', 'low']) priority?: 'high' | 'medium' | 'low';
  @IsOptional() @IsString() @MaxLength(40) assignee?: string;
}

export class CloseReportDto {
  @IsIn(['resolved', 'rejected']) status!: 'resolved' | 'rejected';
  @IsIn(Object.keys(RESOLUTIONS)) type!: ResolutionType;
  @IsString() @MinLength(5) @MaxLength(2000) note!: string;
}

export class CreateTicketDto {
  @IsString() @MinLength(5) @MaxLength(160) subject!: string;
  @IsIn(TICKET_CATEGORIES) category!: TicketCategory;
  @IsString() @MinLength(10) @MaxLength(5000) body!: string;
  @IsOptional() @IsIn(['low', 'normal', 'high']) priority?: 'low' | 'normal' | 'high';
}

export class RateDto {
  @IsInt() @Min(1) @Max(5) rating!: number;
}

export class TicketQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(TICKET_STATUSES) status?: TicketStatus;
  @IsOptional() @IsIn(TICKET_PRIORITIES) priority?: TicketPriority;
  @IsOptional() @IsIn(TICKET_CATEGORIES) category?: TicketCategory;
  @IsOptional() @IsString() @MaxLength(40) assignee?: string;
  @IsOptional() @Transform(bool) @IsBoolean() breached?: boolean;
}

export class TicketReplyDto extends TextDto {
  @IsIn(['open', 'pending', 'resolved']) status!: 'open' | 'pending' | 'resolved';
}

export class TicketStatusDto {
  @IsIn(TICKET_STATUSES) status!: TicketStatus;
}

export class TicketPriorityDto {
  @IsIn(TICKET_PRIORITIES) priority!: TicketPriority;
}

export class EscalateTicketDto {
  @IsString() @MinLength(10) @MaxLength(2000) note!: string;
}

export class IncidentQueryDto {
  @IsOptional() @IsIn(['active', 'resolved', 'all']) scope?: 'active' | 'resolved' | 'all';
  @IsOptional() @IsIn(SEVERITIES) severity?: Severity;
  @IsOptional() @IsString() @MaxLength(120) q?: string;
}

export class DeclareDto {
  @IsString() @MinLength(5) @MaxLength(160) title!: string;
  @IsIn(SEVERITIES) severity!: Severity;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(COMPONENTS.length) @IsIn(COMPONENTS, { each: true }) components!: ComponentId[];
  @IsString() @MaxLength(40) commanderId!: string;
  @IsString() @MinLength(10) @MaxLength(2000) message!: string;
}

export class IncidentUpdateDto {
  @IsIn(INCIDENT_STATUSES) status!: IncidentStatus;
  @IsString() @MinLength(5) @MaxLength(2000) message!: string;
  @IsBoolean() public!: boolean;
}

export class SeverityDto {
  @IsIn(SEVERITIES) severity!: Severity;
}

export class CommanderDto {
  @IsString() @MaxLength(40) commanderId!: string;
}

export class ComponentDto {
  @IsIn(COMPONENTS) component!: ComponentId;
}

export class LinkDto {
  @IsIn(LINK_KINDS) kind!: (typeof LINK_KINDS)[number];
  @IsString() @MinLength(2) @MaxLength(120) label!: string;
  @IsString() @MaxLength(500) @ValidateIf((_, value: string) => !value.startsWith('/')) @IsUrl({ protocols: ['https', 'http'], require_protocol: true }) href!: string;
}

export class PostmortemDto {
  @IsString() @MinLength(20) @MaxLength(5000) summary!: string;
  @IsString() @MinLength(10) @MaxLength(5000) rootCause!: string;
  @IsString() @MinLength(10) @MaxLength(5000) actions!: string;
}

export class ChangeDto {
  @IsIn(CHANGE_KINDS) kind!: string;
  @IsString() @MinLength(3) @MaxLength(300) text!: string;
}

export class CreateReleaseDto {
  @IsString() @Matches(/^\d{4}\.\d{1,2}\.\d{1,3}$/, { message: 'Use YYYY.M.n' }) version!: string;
  @IsString() @MinLength(5) @MaxLength(160) title!: string;
  @IsIn(RELEASE_TYPES) type!: ReleaseType;
  @IsString() @MaxLength(40) ownerId!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ChangeDto) changes!: ChangeDto[];
  @IsOptional() @IsInt() @Min(1) @Max(1440) stageMinutes?: number;
}

export class ScheduleDto {
  @IsInt() at!: number;
}

export class ReleaseQueryDto {
  @IsOptional() @IsIn(['draft', 'scheduled', 'rolling', 'paused', 'live', 'rolled_back']) status?: string;
  @IsOptional() @IsString() @MaxLength(120) q?: string;
}

export class PlatformAuditQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(PLATFORM_CATEGORIES) category?: PlatformCategory;
  @IsOptional() @IsIn(['success', 'failure']) result?: 'success' | 'failure';
  @IsOptional() @Transform(bool) @IsBoolean() sensitive?: boolean;
  @IsOptional() @IsString() @MaxLength(160) actor?: string;
  @IsOptional() @IsIn(PLATFORM_RANGES) range?: PlatformRange;
}