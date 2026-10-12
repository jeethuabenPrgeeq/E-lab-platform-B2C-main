import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CATEGORY_TYPES } from '../audit/events.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { SettingsService } from '../settings/settings.service.js';

const DAY = 86_400_000;
const STALE_DAYS = 14;
const STATUS_LABEL: Record<string, string> = { draft: 'Draft', review: 'In review', ready: 'Ready to publish', published: 'Published', deprecated: 'Deprecated' };

export interface DashboardFilters {
  technologyId?: string;
  days?: number;
}

@Injectable()
export class ContentDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async overview(actor: AdminActor, filters: DashboardFilters) {
    const { values } = await this.settings.all();
    const timeZone = String(values.timezone);
    const now = new Date();
    const since = filters.days ? new Date(now.getTime() - filters.days * DAY) : null;
    const mine: Prisma.ProblemWhereInput = {
      OR: [{ createdById: actor.id }, { assigneeId: actor.id }],
      ...(filters.technologyId ? { technologyId: filters.technologyId } : {}),
      ...(since ? { updatedAt: { gte: since } } : {}),
    };
    const [byStatus, staleDrafts, recent, technologies, activity] = await Promise.all([
      this.prisma.problem.groupBy({ by: ['status'], where: mine, _count: { _all: true } }),
      this.prisma.problem.count({ where: { ...mine, status: 'draft', updatedAt: { lt: new Date(now.getTime() - STALE_DAYS * DAY) } } }),
      this.prisma.problem.findMany({
        where: mine,
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { id: true, slug: true, title: true, status: true, difficulty: true, updatedAt: true, technology: { select: { name: true } } },
      }),
      this.prisma.technology.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.prisma.technicalAuditLog.findMany({
        where: { actorId: actor.id, entityType: { in: [...CATEGORY_TYPES.content] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, summary: true, createdAt: true, entityType: true },
      }),
    ]);

    const count = (status: string) => byStatus.find((row) => row.status === status)?._count._all ?? 0;
    const total = byStatus.reduce((sum, row) => sum + row._count._all, 0);

    return {
      updatedAt: new Intl.DateTimeFormat('en-IN', { timeZone, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(now),
      filters: { technologyId: filters.technologyId ?? null, days: filters.days ?? null },
      technologies,
      summary: [
        { key: 'assigned', label: 'Created or assigned to me', value: total, tone: 'primary' },
        { key: 'draft', label: 'Drafts', value: count('draft'), tone: 'neutral' },
        { key: 'review', label: 'Awaiting review', value: count('review'), tone: 'warning' },
        { key: 'published', label: 'Published', value: count('published'), tone: 'success' },
      ],
      pipeline: ['draft', 'review', 'ready', 'published', 'deprecated'].map((status) => ({ key: status, label: STATUS_LABEL[status], value: count(status) })),
      attention: [
        { key: 'staleDrafts', label: `Drafts untouched for ${STALE_DAYS}+ days`, value: staleDrafts, tone: 'warning' },
        { key: 'ready', label: 'Approved, waiting for Super Admin', value: count('ready'), tone: 'primary' },
      ],
      recent: recent.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        status: row.status,
        statusLabel: STATUS_LABEL[row.status] ?? row.status,
        difficulty: row.difficulty,
        technology: row.technology.name,
        updatedAt: row.updatedAt.getTime(),
      })),
      activity: activity.map((row) => ({ id: row.id, at: row.createdAt.getTime(), summary: row.summary, type: row.entityType })),
    };
  }
}
