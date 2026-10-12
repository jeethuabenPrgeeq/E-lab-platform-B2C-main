import { ValidationPipe } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const QueryPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
});

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function pageArgs(query: PageQueryDto) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  labels: Partial<Record<keyof T, string>> = {},
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of Object.keys(after) as (keyof T)[]) {
    const next = after[key];
    if (next === undefined) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(next)) {
      changes.push({
        field: labels[key] ?? String(key),
        before: before[key] ?? null,
        after: next,
      });
    }
  }
  return changes;
}
