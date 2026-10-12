import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { SaveDraftsDto } from './dto/save-drafts.dto.js';
import { MAX_CELL_LENGTH, PRACTICE_COLUMNS } from './practice-columns.js';
import { validateRows, type ExistingKeys } from './practice-validation.js';

function normalizeRow(raw: Record<string, unknown>): Record<string, string> {
  const values: Record<string, string> = {};

  for (const column of PRACTICE_COLUMNS) {
    const cell = raw[column.key];
    const text =
      typeof cell === 'string'
        ? cell
        : cell === null || cell === undefined
          ? ''
          : String(cell);

    values[column.key] = text.trim().slice(0, MAX_CELL_LENGTH);
  }

  return values;
}

@Injectable()
export class PracticeService {
  constructor(private readonly prisma: PrismaService) {}

  async saveDrafts(dto: SaveDraftsDto, userId: string) {
    const rows = dto.rows.map(normalizeRow);
    const existing = await this.loadExisting(rows);
    const results = validateRows(rows, existing);

    const batch = await this.prisma.$transaction(async (tx) => {
      const created = await tx.practiceDraftBatch.create({
        data: {
          technology: dto.technology.trim(),
          method: dto.method,
          source: dto.source?.trim() || null,
          savedCount: rows.length,
          createdById: userId,
        },
      });

      await tx.practiceDraft.createMany({
        data: rows.map((values, index) => ({
          batchId: created.id,
          rowNumber: index + 1,
          problemId: values.problem_id.toLowerCase(),
          shortName: values.short_name.toLowerCase(),
          title: values.title,
          difficulty: values.difficulty.toLowerCase(),
          values,
          issues: results[index].issues,
          status: (results[index].hasError ? 'validation_failed' : 'validated') as
            | 'validation_failed'
            | 'validated',
        })),
      });

      return created;
    });

    return {
      batchId: batch.id,
      saved: rows.length,
      savedAt: batch.createdAt.toISOString(),
      validated: results.filter((result) => !result.hasError).length,
      validationFailed: results.filter((result) => result.hasError).length,
      warnings: results.filter(
        (result) =>
          !result.hasError && result.issues.some((issue) => issue.level === 'warning'),
      ).length,
    };
  }

  async listBatches() {
    const batches = await this.prisma.practiceDraftBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        technology: true,
        method: true,
        source: true,
        savedCount: true,
        createdAt: true,
      },
    });

    return { batches };
  }

  private async loadExisting(rows: Record<string, string>[]): Promise<ExistingKeys> {
    const ids = [...new Set(rows.map((row) => row.problem_id.toLowerCase()).filter(Boolean))];
    const names = [...new Set(rows.map((row) => row.short_name.toLowerCase()).filter(Boolean))];

    const [drafts, problems] = await Promise.all([
      this.prisma.practiceDraft.findMany({
        where: {
          status: { not: 'archived' },
          OR: [{ problemId: { in: ids } }, { shortName: { in: names } }],
        },
        select: { problemId: true, shortName: true },
      }),
      this.prisma.problem.findMany({
        where: { slug: { in: names } },
        select: { slug: true },
      }),
    ]);

    return {
      problemIds: new Set(drafts.map((draft) => draft.problemId)),
      shortNames: new Set([
        ...drafts.map((draft) => draft.shortName),
        ...problems.map((problem) => problem.slug.toLowerCase()),
      ]),
    };
  }
}