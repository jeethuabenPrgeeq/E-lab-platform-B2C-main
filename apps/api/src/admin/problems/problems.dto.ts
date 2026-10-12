import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OmitType, PartialType } from '@nestjs/swagger';

import { PageQueryDto } from '../common/pagination.js';

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const PROBLEM_STATUSES = [
  'draft',
  'review',
  'ready',
  'published',
  'deprecated',
] as const;
export const WORKSPACE_TYPES = [
  'code',
  'web',
  'framework',
  'database',
  'devops',
] as const;
export const PROBLEM_ACTIONS = [
  'submit',
  'approve',
  'sendBack',
  'publish',
  'moveBack',
  'unpublish',
  'deprecate',
] as const;
export const SORT_FIELDS = [
  'updatedAt',
  'createdAt',
  'title',
  'difficulty',
  'status',
] as const;

export type ProblemAction = (typeof PROBLEM_ACTIONS)[number];

export class CreateProblemDto {
  @IsString()
  @Length(3, 160)
  title!: string;

  @IsString()
  @MaxLength(60)
  technologyId!: string;

  @IsIn(DIFFICULTIES)
  difficulty!: (typeof DIFFICULTIES)[number];

  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and dashes',
  })
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsIn(WORKSPACE_TYPES)
  workspaceType?: (typeof WORKSPACE_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  problemStatement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  inputFormat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  outputFormat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  constraints?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  skills?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  estimatedMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  defaultLanguage?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  allowedLanguages?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  starterCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  referenceSolution?: string;
}

export class UpdateProblemDto extends PartialType(
  OmitType(CreateProblemDto, ['slug'] as const),
) {
  @IsOptional()
  @IsString()
  @Length(5, 300)
  reason?: string;
}

export class TransitionDto {
  @IsIn(PROBLEM_ACTIONS)
  action!: ProblemAction;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ProblemQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(PROBLEM_STATUSES)
  status?: (typeof PROBLEM_STATUSES)[number];

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: (typeof DIFFICULTIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(60)
  technologyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  technology?: string;

  @IsOptional()
  @IsIn(SORT_FIELDS)
  sort?: (typeof SORT_FIELDS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  missingTests?: number;
}
