import { IsIn, IsOptional, IsString, Length, MaxLength, ValidateIf } from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';
import { PROBLEM_STATUSES } from '../problems/problems.dto.js';

export class OwnershipQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(PROBLEM_STATUSES) status?: (typeof PROBLEM_STATUSES)[number];
  @IsOptional() @IsString() @MaxLength(40) assignee?: string;
}

export class AssignProblemDto {
  @ValidateIf((dto: AssignProblemDto) => dto.assigneeId !== null) @IsString() @MaxLength(40) assigneeId!: string | null;
  @IsOptional() @IsString() @Length(3, 300) reason?: string;
}
