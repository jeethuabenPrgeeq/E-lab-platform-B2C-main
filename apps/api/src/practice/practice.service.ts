import { BadRequestException, Injectable } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SaveDraftsDto } from './dto/save-drafts.dto.js';
import { MAX_CELL_LENGTH, PRACTICE_COLUMNS } from './practice-columns.js';
import { validateRows, type ExistingKeys } from './practice-validation.js';

type Db = PrismaService | Prisma.TransactionClient;

export function normalizeRow(raw: Record<string, unknown>): Record<string, string> {
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

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('practice_drafts_upload'))`;

        const existing = await this.loadExisting(tx, rows);
        const results = validateRows(rows, existing);
        const accepted = rows
          .map((values, index) => ({ values, index, result: results[index] }))
          .filter((item) => !item.result.hasError);
        const skipped = rows.length - accepted.length;

        if (accepted.length === 0) {
          throw new BadRequestException(
            `No new problems to save. All ${rows.length} row${rows.length === 1 ? '' : 's'} already exist or have errors.`,
          );
        }

        const batch = await tx.practiceDraftBatch.create({
          data: {
            technology: dto.technology.trim(),
            method: dto.method,
            source: dto.source?.trim() || null,
            savedCount: accepted.length,
            createdById: userId,
          },
        });

        await tx.practiceDraft.createMany({
          data: accepted.map(({ values, index, result }) => ({
            batchId: batch.id,
            rowNumber: index + 1,
            problemId: values.problem_id.toLowerCase(),
            shortName: values.short_name.toLowerCase(),
            title: values.title,
            difficulty: values.difficulty.toLowerCase(),
            values,
            issues: result.issues,
            status: 'validated' as const,
          })),
        });

        return {
          batchId: batch.id,
          saved: accepted.length,
          savedAt: batch.createdAt.toISOString(),
          validated: accepted.length,
          validationFailed: skipped,
          skipped,
          warnings: accepted.filter(({ result }) => result.issues.some((issue) => issue.level === 'warning')).length,
        };
      },
      { timeout: 30_000 },
    );
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

  private async loadExisting(db: Db, rows: Record<string, string>[]): Promise<ExistingKeys> {
    const ids = [...new Set(rows.map((row) => row.problem_id.toLowerCase()).filter(Boolean))];
    const names = [...new Set(rows.map((row) => row.short_name.toLowerCase()).filter(Boolean))];

    const [drafts, problems] = await Promise.all([
      db.practiceDraft.findMany({
        where: {
          status: { notIn: ['archived', 'validation_failed'] },
          OR: [{ problemId: { in: ids } }, { shortName: { in: names } }],
        },
        select: { problemId: true, shortName: true },
      }),
      db.problem.findMany({
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