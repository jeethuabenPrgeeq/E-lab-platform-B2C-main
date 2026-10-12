import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import { activityFor } from './activity.js';
import { TIER_ORDER } from './catalog.service.js';
import type { CreatePathDto, PathQueryDto, PathStatusDto, SavePathDto } from './content.dto.js';

export const MIN_STEPS = 3;
const TIER_LABEL = { free: 'Free', starter: 'Starter', professional: 'Professional', premium: 'Premium' } as const;

const INCLUDE = { steps: { orderBy: { position: 'asc' }, select: { problemId: true } } } as const;
type Row = Prisma.LearningPathGetPayload<{ include: typeof INCLUDE }>;

function present(row: Row) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    level: row.level,
    tier: row.tier,
    status: row.status,
    certificate: row.certificate,
    steps: row.steps.map((step) => step.problemId),
    enrolled: 0,
    completion: 0,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

@Injectable()
export class PathsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PathQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where: Prisma.LearningPathWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.q ? { title: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const [rows, total, byStatus] = await Promise.all([
      this.prisma.learningPath.findMany({ where, include: INCLUDE, orderBy: { updatedAt: query.order ?? 'desc' }, skip, take }),
      this.prisma.learningPath.count({ where }),
      this.prisma.learningPath.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      items: rows.map(present),
      total,
      page,
      pageSize,
      statusCounts: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    };
  }

  async get(id: string) {
    const row = await this.prisma.learningPath.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException('Learning path not found.');
    const activity = await activityFor(this.prisma, 'learning_path', [id]);
    return { ...present(row), activity: activity.get(id) ?? [] };
  }

  async create(dto: CreatePathDto, actor: AdminActor) {
    const id = await this.prisma.$transaction(async (tx) => {
      const path = await tx.learningPath.create({
        data: { title: dto.title.trim(), level: dto.level, tier: dto.tier, createdById: actor.id },
      });
      await this.audit.record(tx, actor, { action: 'path.create', entityType: 'learning_path', entityId: path.id, summary: 'Created the path' });
      return path.id;
    });
    return this.get(id);
  }

  private async issues(dto: SavePathDto) {
    const issues: string[] = [];
    if (dto.title.trim().length < 3) issues.push('Give the path a title');
    if (dto.summary.trim().length < 10) issues.push('Write a summary of at least 10 characters');
    if (dto.steps.length < MIN_STEPS) issues.push(`Add at least ${MIN_STEPS} steps`);
    const rows = await this.prisma.problem.findMany({
      where: { id: { in: dto.steps }, status: 'published' },
      select: { id: true, title: true, tier: true, visibility: true },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    for (const id of dto.steps) {
      const item = byId.get(id);
      if (!item) {
        issues.push(`Step ${id} is not in the published catalog`);
        continue;
      }
      if (item.visibility === 'retired') issues.push(`"${item.title}" is retired. Replace it`);
      if (TIER_ORDER.indexOf(item.tier) > TIER_ORDER.indexOf(dto.tier)) issues.push(`"${item.title}" needs ${TIER_LABEL[item.tier]}, but the path is ${TIER_LABEL[dto.tier]}`);
    }
    return issues;
  }

  private async write(id: string, dto: SavePathDto, actor: AdminActor, publish: boolean) {
    const existing = await this.prisma.learningPath.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Learning path not found.');
    if (new Set(dto.steps).size !== dto.steps.length) throw new BadRequestException('A step can only appear once in a path.');
    const live = publish || existing.status === 'published';
    if (live) {
      const issues = await this.issues(dto);
      if (issues.length) throw new BadRequestException({ message: 'The path is not ready to publish.', issues });
    } else {
      if (dto.title.trim().length < 3) throw new BadRequestException('Give the path a title');
      const found = await this.prisma.problem.count({ where: { id: { in: dto.steps }, status: 'published' } });
      if (found !== dto.steps.length) throw new BadRequestException('Some steps are not in the published catalog.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.learningPath.update({
        where: { id },
        data: {
          title: dto.title.trim(),
          summary: dto.summary.trim(),
          level: dto.level,
          tier: dto.tier,
          certificate: dto.certificate,
          ...(publish ? { status: 'published' } : {}),
        },
      });
      await tx.learningPathStep.deleteMany({ where: { pathId: id } });
      if (dto.steps.length) {
        await tx.learningPathStep.createMany({ data: dto.steps.map((problemId, position) => ({ pathId: id, problemId, position })) });
      }
      await this.audit.record(tx, actor, {
        action: publish && existing.status !== 'published' ? 'path.publish' : 'path.save',
        entityType: 'learning_path',
        entityId: id,
        summary: existing.status === 'published' ? 'Saved changes to the live path' : publish ? 'Published the path' : 'Saved the draft',
      });
    });
    return this.get(id);
  }

  save(id: string, dto: SavePathDto, actor: AdminActor) {
    return this.write(id, dto, actor, false);
  }

  publish(id: string, dto: SavePathDto, actor: AdminActor) {
    return this.write(id, dto, actor, true);
  }

  async setStatus(id: string, dto: PathStatusDto, actor: AdminActor) {
    const existing = await this.prisma.learningPath.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Learning path not found.');
    if (existing.status === dto.status) return this.get(id);
    const note = dto.note?.trim();
    await this.prisma.$transaction(async (tx) => {
      await tx.learningPath.update({ where: { id }, data: { status: dto.status } });
      await this.audit.record(tx, actor, {
        action: `path.${dto.status === 'archived' ? 'archive' : 'draft'}`,
        entityType: 'learning_path',
        entityId: id,
        summary: dto.status === 'archived' ? `Archived${note ? `: ${note}` : ''}` : 'Moved back to draft',
      });
    });
    return this.get(id);
  }

  async duplicate(id: string, actor: AdminActor) {
    const source = await this.prisma.learningPath.findUnique({ where: { id }, include: INCLUDE });
    if (!source) throw new NotFoundException('Learning path not found.');
    const copyId = await this.prisma.$transaction(async (tx) => {
      const copy = await tx.learningPath.create({
        data: {
          title: `${source.title} (copy)`.slice(0, 120),
          summary: source.summary,
          level: source.level,
          tier: source.tier,
          certificate: source.certificate,
          createdById: actor.id,
        },
      });
      if (source.steps.length) {
        await tx.learningPathStep.createMany({ data: source.steps.map((step, position) => ({ pathId: copy.id, problemId: step.problemId, position })) });
      }
      await this.audit.record(tx, actor, { action: 'path.duplicate', entityType: 'learning_path', entityId: copy.id, summary: `Duplicated from ${source.title}` });
      return copy.id;
    });
    return this.get(copyId);
  }

  async remove(id: string, actor: AdminActor) {
    const existing = await this.prisma.learningPath.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Learning path not found.');
    if (existing.status === 'published') throw new BadRequestException('Archive a published path before deleting it.');
    await this.prisma.$transaction(async (tx) => {
      await tx.learningPath.delete({ where: { id } });
      await this.audit.record(tx, actor, { action: 'path.delete', entityType: 'learning_path', entityId: id, summary: `Deleted the path ${existing.title}` });
    });
    return { deleted: true };
  }
}