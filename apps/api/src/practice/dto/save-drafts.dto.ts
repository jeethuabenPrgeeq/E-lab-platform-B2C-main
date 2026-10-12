import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SaveDraftsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  technology!: string;

  @IsIn(['manual', 'csv', 'ai'])
  method!: 'manual' | 'csv' | 'ai';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  source?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsObject({ each: true })
  rows!: Record<string, unknown>[];
}