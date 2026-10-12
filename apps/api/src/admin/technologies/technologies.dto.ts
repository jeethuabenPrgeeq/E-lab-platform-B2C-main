import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';

export const TECH_CATEGORIES = [
  'language',
  'framework',
  'database',
  'devops',
  'tool',
] as const;
export const TECH_STATUSES = ['active', 'draft', 'disabled'] as const;

export class CreateTechnologyDto {
  @IsString()
  @Length(1, 60)
  name!: string;

  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and dashes',
  })
  @MaxLength(60)
  slug?: string;

  @IsIn(TECH_CATEGORIES)
  category!: (typeof TECH_CATEGORIES)[number];

  @IsOptional()
  @IsIn(TECH_STATUSES)
  status?: (typeof TECH_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  runtimeImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  version?: string;

  @IsOptional()
  @Matches(/^(\.[a-z0-9]+)?$/i, { message: 'fileExtension must look like .py' })
  @MaxLength(12)
  fileExtension?: string;

  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'judgeLanguage must be a judge language key like cpp',
  })
  @MaxLength(30)
  judgeLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateTechnologyDto {
  @IsOptional()
  @IsString()
  @Length(1, 60)
  name?: string;

  @IsOptional()
  @IsIn(TECH_CATEGORIES)
  category?: (typeof TECH_CATEGORIES)[number];

  @IsOptional()
  @IsIn(TECH_STATUSES)
  status?: (typeof TECH_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  runtimeImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  version?: string;

  @IsOptional()
  @Matches(/^(\.[a-z0-9]+)?$/i, { message: 'fileExtension must look like .py' })
  @MaxLength(12)
  fileExtension?: string;

  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'judgeLanguage must be a judge language key like cpp',
  })
  @MaxLength(30)
  judgeLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class TechnologyQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(TECH_CATEGORIES)
  category?: (typeof TECH_CATEGORIES)[number];

  @IsOptional()
  @IsIn(TECH_STATUSES)
  status?: (typeof TECH_STATUSES)[number];
}
