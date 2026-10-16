import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export const LEARNER_STATUSES = ['active', 'revoked'] as const;
export const MAX_IMPORT_ROWS = 100;

export class LearnerQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsIn(LEARNER_STATUSES) status?: (typeof LEARNER_STATUSES)[number];
}

export class InviteLearnerDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsEmail() @MaxLength(160) email!: string;
}

export class ImportLearnerRowDto {
  @IsString() @MaxLength(200) name!: string;
  @IsString() @MaxLength(200) email!: string;
}

export class ImportLearnersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_IMPORT_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportLearnerRowDto)
  rows!: ImportLearnerRowDto[];
}

export class CreateGroupDto {
  @IsString() @MinLength(2) @MaxLength(60) name!: string;
}

export class SetLearnerGroupDto {
  @IsOptional() @IsString() @MaxLength(60) groupId?: string | null;
}

export class LearnerReasonDto {
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
}
