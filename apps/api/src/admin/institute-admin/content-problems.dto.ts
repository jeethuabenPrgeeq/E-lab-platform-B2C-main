import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';
import { DIFFICULTIES, PROBLEM_STATUSES, UpdateProblemDto } from '../problems/problems.dto.js';

export const LIBRARY_SCOPES = ['all', 'created', 'assigned'] as const;

export class ContentProblemQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(LIBRARY_SCOPES) scope?: (typeof LIBRARY_SCOPES)[number];
  @IsOptional() @IsIn(PROBLEM_STATUSES) status?: (typeof PROBLEM_STATUSES)[number];
  @IsOptional() @IsIn(DIFFICULTIES) difficulty?: (typeof DIFFICULTIES)[number];
  @IsOptional() @IsString() @MaxLength(60) technologyId?: string;
}

export class ContentUpdateProblemDto extends UpdateProblemDto {
  @IsOptional() @IsISO8601() expectedUpdatedAt?: string;
}
