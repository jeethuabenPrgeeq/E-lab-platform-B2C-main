import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';

export class AuditQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  entityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  action?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
