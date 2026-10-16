import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import type { BatchQueryDto, CreateBatchDto, UpdateBatchDto } from './content-batches.dto.js';

type Db = Prisma.TransactionClient | PrismaService;

const BATCH_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  items: {
    orderBy: { position: 'asc' },
    select: {
      position: true,
      problem: {
        select: { id: true, slug: true, title: true, difficulty: true, status: true, technology: { select: { name: true } } },
      },
    },
  },
} satisfies Prisma.ContentBatchInclude;

type BatchRow = Prisma.ContentBatchGetPayload<{ include: typeof BATCH_INCLUDE }>;

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  type: 'Type',
  focus: 'Focus',
  easyTarget: 'Easy target',
  mediumTarget: 'Medium target',
  hardTarget: 'Hard target',
};

@Injectable()
export class ContentBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async testCounts(problemIds: string[]) {
    const rows = problemIds.length
      ? await this.prisma.testCase.groupBy({ by: ['problemId', 'hidden'], where: { problemId: { in: problemIds }, enabled: true }, _count: { _all: true } })
      : [];
    const map = new Map<string, { sample: number; hidden: number }>();
    for (const row of rows) {
      const entry = map.get(row.problemId) ?? { sample: 0, hidden: 0 };
      if (row.hidden) entry.hidden = row._count._all;
      else entry.sample = row._count._all;
      map.set(row.problemId, entry);
    }
    return map;
  }

  private shape(batch: BatchRow, counts: Map<string, { sample: number; hidden: number }>, withItems: boolean) {
    const items = batch.items.map(({ problem, position }) => {
      const tests = counts.get(problem.id) ?? { sample: 0, hidden: 0 };
      return {
        id: problem.id,
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
        status: problem.status,
        technology: problem.technology.name,
        sampleTests: tests.sample,
        hiddenTests: tests.hidden,
        position,
      };
    });
    const count = (difficulty: string) => items.filter((item) => item.difficulty === difficulty).length;
    return {
      id: batch.id,
      name: batch.name,
      description: batch.description,
      type: batch.type,
      focus: batch.focus,
      targets: { easy: batch.easyTarget, medium: batch.mediumTarget, hard: batch.hardTarget },
      difficulty: { easy: count('easy'), medium: count('medium'), hard: count('hard') },
      problemCount: items.length,
      withoutSample: items.filter((item) => item.sampleTests === 0).length,
      withoutHidden: items.filter((item) => item.hiddenTests === 0).length,
      notPublished: items.filter((item) => item.status !== 'published').length,
      createdBy: batch.createdBy,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      ...(withItems ? { items } : {}),
    };
  }

  private async owned(id: string, organizationId: string, db: Db = this.prisma) {
    const batch = await db.contentBatch.findFirst({ where: { id, organizationId }, include: BATCH_INCLUDE });
    if (!batch) throw new NotFoundException('Batch not found in your institution.');
    return batch;
  }

  private async checkProblems(problemIds: string[], organizationId: string) {
    if (new Set(problemIds).size !== problemIds.length) throw new BadRequestException('A problem can only appear once in a batch.');
    if (problemIds.length === 0) return;
    const found = await this.prisma.problem.findMany({ where: { id: { in: problemIds }, organizationId }, select: { id: true, status: true } });
    const missing = problemIds.length - found.length;
    if (missing > 0) throw new BadRequestException(`${missing} selected problem${missing === 1 ? ' is' : 's are'} not in your institution.`);
    const deprecated = found.filter((problem) => problem.status === 'deprecated').length;
    if (deprecated > 0) throw new BadRequestException(`Remove ${deprecated} deprecated problem${deprecated === 1 ? '' : 's'} from the batch.`);
  }

  async list(query: BatchQueryDto, organizationId: string) {
    const q = query.q?.trim();
    const batches = await this.prisma.contentBatch.findMany({
      where: { organizationId, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: { updatedAt: 'desc' },
      include: BATCH_INCLUDE,
    });
    const counts = await this.testCounts([...new Set(batches.flatMap((batch) => batch.items.map((item) => item.problem.id)))]);
    return { items: batches.map((batch) => this.shape(batch, counts, false)) };
  }

  async get(id: string, organizationId: string) {
    const batch = await this.owned(id, organizationId);
    return this.shape(batch, await this.testCounts(batch.items.map((item) => item.problem.id)), true);
  }

  async create(dto: CreateBatchDto, actor: AdminActor, organizationId: string) {
    const problemIds = dto.problemIds ?? [];
    await this.checkProblems(problemIds, organizationId);
    const id = await this.prisma.$transaction(async (tx) => {
      const batch = await tx.contentBatch.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          description: dto.description?.trim() ?? '',
          type: dto.type ?? 'regular_practice',
          focus: dto.focus?.trim() ?? '',
          easyTarget: dto.easyTarget ?? 0,
          mediumTarget: dto.mediumTarget ?? 0,
          hardTarget: dto.hardTarget ?? 0,
          createdById: actor.id,
          items: { create: problemIds.map((problemId, position) => ({ problemId, position })) },
        },
      });
      await this.audit.record(tx, actor, {
        action: 'content_batch.create',
        entityType: 'content_batch',
        entityId: batch.id,
        summary: `Created batch ${batch.name} with ${problemIds.length} problem${problemIds.length === 1 ? '' : 's'}`,
      });
      return batch.id;
    });
    return this.get(id, organizationId);
  }

  async update(id: string, dto: UpdateBatchDto, actor: AdminActor, organizationId: string) {
    const existing = await this.owned(id, organizationId);
    if (dto.problemIds) await this.checkProblems(dto.problemIds, organizationId);
    const { problemIds, ...rest } = dto;
    const fields = Object.fromEntries(
      Object.entries(rest)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
    ) as Prisma.ContentBatchUpdateInput;
    const changes = Object.entries(fields)
      .filter(([key, value]) => (existing as Record<string, unknown>)[key] !== value)
      .map(([key, value]) => ({ field: FIELD_LABELS[key] ?? key, before: (existing as Record<string, unknown>)[key], after: value }));
    const beforeIds = existing.items.map((item) => item.problem.id);
    const itemsChanged = Boolean(problemIds) && JSON.stringify(beforeIds) !== JSON.stringify(problemIds);
    if (changes.length === 0 && !itemsChanged) return this.get(id, organizationId);

    await this.prisma.$transaction(async (tx) => {
      await tx.contentBatch.update({ where: { id }, data: { ...fields, updatedAt: new Date() } });
      if (itemsChanged && problemIds) {
        await tx.contentBatchItem.deleteMany({ where: { batchId: id } });
        await tx.contentBatchItem.createMany({ data: problemIds.map((problemId, position) => ({ batchId: id, problemId, position })) });
      }
      const added = itemsChanged ? problemIds!.filter((pid) => !beforeIds.includes(pid)).length : 0;
      const removed = itemsChanged ? beforeIds.filter((pid) => !problemIds!.includes(pid)).length : 0;
      await this.audit.record(tx, actor, {
        action: 'content_batch.update',
        entityType: 'content_batch',
        entityId: id,
        summary: `Edited batch ${existing.name}`,
        changes: {
          fields: changes,
          ...(itemsChanged ? { problems: { added, removed, reordered: added === 0 && removed === 0 } } : {}),
        },
      });
    });
    return this.get(id, organizationId);
  }

  async remove(id: string, actor: AdminActor, organizationId: string) {
    const existing = await this.owned(id, organizationId);
    await this.prisma.$transaction(async (tx) => {
      await tx.contentBatch.delete({ where: { id } });
      await this.audit.record(tx, actor, {
        action: 'content_batch.delete',
        entityType: 'content_batch',
        entityId: id,
        summary: `Deleted batch ${existing.name}`,
      });
    });
    return { deleted: true };
  }
}
