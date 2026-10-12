import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

class ReasonFields {
  @IsOptional()
  @IsString()
  @Length(5, 300)
  reason?: string;
}

export class CreateTestCaseDto extends ReasonFields {
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  input?: string;

  @IsString()
  @MaxLength(100000)
  expectedOutput!: string;

  @IsBoolean()
  hidden!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(60000)
  timeoutMs?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateTestCaseDto extends PartialType(CreateTestCaseDto) {}

export class ReasonDto extends ReasonFields {}

export class ReorderTestCasesDto extends ReasonFields {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids!: string[];
}

export class CreateSourceCheckDto extends ReasonFields {
  @IsIn(['required', 'forbidden'])
  kind!: 'required' | 'forbidden';

  @IsString()
  @Length(1, 200)
  filePath!: string;

  @IsString()
  @Length(1, 500)
  pattern!: string;

  @IsOptional()
  @IsBoolean()
  isRegex?: boolean;

  @IsString()
  @Length(3, 300)
  message!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateSourceCheckDto extends PartialType(CreateSourceCheckDto) {}
