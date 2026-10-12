import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import { activityFor } from './activity.js';
import type { CatalogQueryDto, CatalogTierDto, CatalogVisibilityDto, Tier } from './content.dto.js';

export const MAX_FEATURED = 8;
export const TIER_ORDER: Tier[] = ['free', 'starter', 'professional', 'premium'];
const TIER_LABEL: Record<Tier, string> = { free: 'Free', starter: 'Starter', professional: 'Professional', premium: 'Premium' };

const TYPE_WORKSPACES = {
  problem: ['code', 'database'],
  project: ['web', 'framework'],
  lab: ['devops'],
} as const;

const SELECT = {
  id: true,
  slug: true,
  title: true,
  difficulty: true,
  workspaceType: true,
  estimatedMinutes: true,
  tier: true,
  visibility: true,
  visibilityReason: true,
  featured: true,
  publishedAt: true,
  updatedAt: true,
  technology: { select: { name: true, slug: true } },
} as const;

type Row = Prisma.ProblemGetPayload<{ select: typeof SELECT }>;

function contentType(workspace: string) {
  if (workspace === 'devops') return 'lab';
  if (workspace === 'web' || workspace === 'framework') return 'project';
  return 'problem';
}

export function presentItem(row: Row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: contentType(row.workspaceType),
    technology: row.technology.name,
    difficulty: row.difficulty.toLowerCase(),
    tier: row.tier,
    visibility: row.visibility,
    featured: row.featured,
    minutes: row.estimatedMinutes,
    learners: 0,
    completion: 0,
    rating: 0,
    ratings: 0,
    openReports: 0,
    publishedAt: row.publishedAt?.getTime() ?? row.updatedAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    visibilityReason: row.visibilityReason,
  };
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: CatalogQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where: Prisma.ProblemWhereInput = {
      status: 'published',
      ...(query.type ? { workspaceType: { in: [...TYPE_WORKSPACES[query.type]] } } : {}),
      ...(query.technology ? { technology: { OR: [{ slug: query.technology }, { name: query.technology }] } } : {}),
      ...(query.tier ? { tier: query.tier } : {}),
      ...(query.visibility ? { visibility: query.visibility } : {}),
      ...(query.featured ? { featured: query.featured === 'true' } : {}),
      ...(query.q
        ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { slug: { contains: query.q, mode: 'insensitive' } }] }
        : {}),
    };
    const [rows, total, byTier, byVisibility, featured] = await Promise.all([
      this.prisma.problem.findMany({ where, select: SELECT, orderBy: [{ featured: 'desc' }, { publishedAt: query.order ?? 'desc' }], skip, take }),
      this.prisma.problem.count({ where }),
      this.prisma.problem.groupBy({ by: ['tier'], where: { status: 'published' }, _count: { _all: true } }),
      this.prisma.problem.groupBy({ by: ['visibility'], where: { status: 'published' }, _count: { _all: true } }),
      this.prisma.problem.count({ where: { status: 'published', featured: true } }),
    ]);
    return {
      items: rows.map(presentItem),
      total,
      page,
      pageSize,
      tierCounts: Object.fromEntries(byTier.map((row) => [row.tier, row._count._all])),
      visibilityCounts: Object.fromEntries(byVisibility.map((row) => [row.visibility, row._count._all])),
      featuredCount: featured,
      maxFeatured: MAX_FEATURED,
    };
  }

  async get(id: string) {
    const row = await this.prisma.problem.findFirst({ where: { id, status: 'published' }, select: SELECT });
    if (!row) throw new NotFoundException('Catalog item not found.');
    const activity = await activityFor(this.prisma, 'problem', [id]);
    return { ...presentItem(row), activity: activity.get(id) ?? [] };
  }

  private async published(ids: string[]) {
    const unique = [...new Set(ids)];
    if (unique.length === 0) throw new BadRequestException('Pick at least one item.');
    const rows = await this.prisma.problem.findMany({ where: { id: { in: unique }, status: 'published' }, select: { id: true, title: true, tier: true, visibility: true, featured: true } });
    if (rows.length !== unique.length) throw new BadRequestException('Some items are not in the published catalog.');
    return rows;
  }

  async setTier(dto: CatalogTierDto, actor: AdminActor) {
    const rows = await this.published(dto.ids);
    const changing = rows.filter((row) => row.tier !== dto.tier);
    await this.prisma.$transaction(async (tx) => {
      for (const row of changing) {
        await tx.problem.update({ where: { id: row.id }, data: { tier: dto.tier } });
        await this.audit.record(tx, actor, {
          action: 'catalog.tier',
          entityType: 'problem',
          entityId: row.id,
          summary: `Changed access from ${TIER_LABEL[row.tier]} to ${TIER_LABEL[dto.tier]}`,
          changes: { before: row.tier, after: dto.tier },
        });
      }
    });
    return { updated: changing.length };
  }

  async setVisibility(dto: CatalogVisibilityDto, actor: AdminActor) {
    const reason = dto.reason?.trim() || null;
    if (dto.visibility !== 'listed' && !reason) throw new BadRequestException('A reason is required to hide or retire content.');
    const rows = await this.published(dto.ids);
    const changing = rows.filter((row) => row.visibility !== dto.visibility);
    await this.prisma.$transaction(async (tx) => {
      for (const row of changing) {
        await tx.problem.update({
          where: { id: row.id },
          data: {
            visibility: dto.visibility,
            visibilityReason: dto.visibility === 'listed' ? null : reason,
            ...(dto.visibility === 'listed' ? {} : { featured: false }),
          },
        });
        await this.audit.record(tx, actor, {
          action: `catalog.${dto.visibility}`,
          entityType: 'problem',
          entityId: row.id,
          summary: dto.visibility === 'listed' ? 'Listed in the catalog again' : `${dto.visibility === 'hidden' ? 'Hidden' : 'Retired'}: ${reason}`,
          changes: { before: row.visibility, after: dto.visibility, ...(reason ? { reason } : {}) },
        });
      }
    });
    return { updated: changing.length };
  }

  async toggleFeatured(id: string, actor: AdminActor) {
    const [row] = await this.published([id]);
    if (!row.featured) {
      if (row.visibility !== 'listed') throw new BadRequestException('Only listed items can be featured.');
      const count = await this.prisma.problem.count({ where: { status: 'published', featured: true } });
      if (count >= MAX_FEATURED) throw new BadRequestException(`The catalog home shows at most ${MAX_FEATURED} featured items. Unfeature one first.`);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.problem.update({ where: { id }, data: { featured: !row.featured } });
      await this.audit.record(tx, actor, {
        action: row.featured ? 'catalog.unfeature' : 'catalog.feature',
        entityType: 'problem',
        entityId: id,
        summary: row.featured ? 'Removed from featured' : 'Featured on the catalog home',
      });
    });
    return this.get(id);
  }
}