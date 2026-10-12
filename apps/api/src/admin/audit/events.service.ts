import { Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { pageArgs } from '../common/pagination.js';
import type { EventQueryDto, EventRange } from './events.dto.js';
import { CATEGORY_TYPES, categoryOf, cleanIp, deviceOf, locationOf, readChanges, severityOf, severityWhere, toCsv } from './events.js';

const RANGE_MS: Record<Exclude<EventRange, 'all'>, number> = { '24h': 86_400_000, '7d': 7 * 86_400_000, '30d': 30 * 86_400_000, '90d': 90 * 86_400_000 };
const EXPORT_LIMIT = 10_000;

const ROW_INCLUDE = { actor: { select: { name: true, email: true, role: true, adminRole: { select: { name: true } } } } } as const;

type Row = Prisma.TechnicalAuditLogGetPayload<{ include: typeof ROW_INCLUDE }>;

@Injectable()
export class AuditEventsService {
  constructor(private readonly prisma: PrismaService) {}

  private where(query: EventQueryDto): Prisma.TechnicalAuditLogWhereInput {
    const and: Prisma.TechnicalAuditLogWhereInput[] = [];
    const range = query.range ?? '7d';
    if (range !== 'all') and.push({ createdAt: { gte: new Date(Date.now() - RANGE_MS[range]) } });
    if (query.category) and.push({ entityType: { in: [...CATEGORY_TYPES[query.category]] } });
    if (query.severity) and.push(severityWhere(query.severity));
    if (query.outcome) and.push({ outcome: query.outcome });
    if (query.actor) and.push({ actorEmail: { equals: query.actor, mode: 'insensitive' } });
    if (query.q) {
      and.push({
        OR: [
          { summary: { contains: query.q, mode: 'insensitive' } },
          { actorEmail: { contains: query.q, mode: 'insensitive' } },
          { action: { contains: query.q, mode: 'insensitive' } },
          { entityId: { contains: query.q, mode: 'insensitive' } },
          { ipAddress: { contains: query.q } },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  private async labels(rows: Row[]) {
    const ids = (types: string[]) => [...new Set(rows.filter((row) => types.includes(row.entityType)).map((row) => row.entityId))];
    const [users, problems, technologies, paths, challenges, campaigns, roles, tickets] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: ids(['user', 'admin', 'auth']) } }, select: { id: true, name: true, email: true } }),
      this.prisma.problem.findMany({ where: { id: { in: ids(['problem']) } }, select: { id: true, title: true } }),
      this.prisma.technology.findMany({ where: { id: { in: ids(['technology']) } }, select: { id: true, name: true } }),
      this.prisma.learningPath.findMany({ where: { id: { in: ids(['learning_path']) } }, select: { id: true, title: true } }),
      this.prisma.challenge.findMany({ where: { id: { in: ids(['challenge']) } }, select: { id: true, title: true } }),
      this.prisma.notificationCampaign.findMany({ where: { id: { in: ids(['campaign']) } }, select: { id: true, name: true } }),
      this.prisma.adminRole.findMany({ where: { id: { in: ids(['admin_role']) } }, select: { id: true, name: true } }),
      this.prisma.supportTicket.findMany({ where: { id: { in: ids(['support_ticket']) } }, select: { id: true, number: true, subject: true } }),
    ]);
    const map = new Map<string, string>();
    for (const user of users) map.set(user.id, `${user.name} (${user.email})`);
    for (const item of problems) map.set(item.id, item.title);
    for (const item of technologies) map.set(item.id, item.name);
    for (const item of paths) map.set(item.id, item.title);
    for (const item of challenges) map.set(item.id, item.title);
    for (const item of campaigns) map.set(item.id, item.name);
    for (const item of roles) map.set(item.id, item.name);
    for (const item of tickets) map.set(item.id, `#${item.number} ${item.subject}`);
    return map;
  }

  private present(row: Row, labels: Map<string, string>) {
    const { changes, reason } = readChanges(row.action, row.changes);
    const ip = cleanIp(row.ipAddress);
    const role = row.actor
      ? row.actor.role === 'SUPER_ADMIN'
        ? (row.actor.adminRole?.name ?? 'Super admin')
        : row.actor.role === 'PLATFORM_ADMIN'
          ? 'Platform admin'
          : 'Learner'
      : row.actorEmail === 'system'
        ? 'System'
        : 'Unknown';
    return {
      id: row.id,
      at: row.createdAt.getTime(),
      actor: { name: row.actor?.name ?? (row.actorEmail === 'system' ? 'System' : row.actorEmail), email: row.actor?.email ?? row.actorEmail, role },
      action: row.action,
      summary: row.summary,
      category: categoryOf(row.entityType),
      severity: severityOf(row.action),
      target: { type: row.entityType, id: row.entityId, label: labels.get(row.entityId) ?? row.entityId },
      ip: ip ?? '—',
      location: row.actorEmail === 'system' ? 'eLab servers' : locationOf(ip),
      device: row.actorEmail === 'system' ? 'Automated job' : deviceOf(row.userAgent),
      changes,
      reason,
      outcome: row.outcome === 'failure' ? 'failure' : 'success',
    };
  }

  async list(query: EventQueryDto) {
    const where = this.where(query);
    const { page, pageSize, skip, take } = pageArgs(query);
    const day = new Date(Date.now() - RANGE_MS['24h']);
    const [rows, total, critical, failures24h, actors] = await Promise.all([
      this.prisma.technicalAuditLog.findMany({ where, orderBy: { createdAt: query.order ?? 'desc' }, skip, take, include: ROW_INCLUDE }),
      this.prisma.technicalAuditLog.count({ where }),
      this.prisma.technicalAuditLog.count({ where: { AND: [where, severityWhere('critical')] } }),
      this.prisma.technicalAuditLog.count({ where: { action: { in: ['auth.login_failed', 'auth.blocked'] }, createdAt: { gte: day } } }),
      this.prisma.technicalAuditLog.groupBy({ by: ['actorEmail'], where, _count: { _all: true }, orderBy: { _count: { actorEmail: 'desc' } }, take: 50 }),
    ]);
    const labels = await this.labels(rows);
    return {
      items: rows.map((row) => this.present(row, labels)),
      total,
      page,
      pageSize,
      summary: { critical, failedSignIns24h: failures24h },
      actors: actors.map((item) => ({ email: item.actorEmail, events: item._count._all })),
    };
  }

  async get(id: string) {
    const row = await this.prisma.technicalAuditLog.findUnique({ where: { id }, include: ROW_INCLUDE });
    if (!row) throw new NotFoundException('Event not found.');
    const labels = await this.labels([row]);
    const event = this.present(row, labels);
    const related = await this.prisma.technicalAuditLog.findMany({
      where: { entityType: row.entityType, entityId: row.entityId, id: { not: row.id } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: ROW_INCLUDE,
    });
    return { ...event, related: related.map((item) => this.present(item, labels)) };
  }

  async exportCsv(query: EventQueryDto) {
    const rows = await this.prisma.technicalAuditLog.findMany({ where: this.where(query), orderBy: { createdAt: 'desc' }, take: EXPORT_LIMIT, include: ROW_INCLUDE });
    const labels = await this.labels(rows);
    const head = ['event_id', 'time_utc', 'actor', 'actor_email', 'actor_role', 'action', 'summary', 'category', 'severity', 'outcome', 'target_type', 'target_id', 'target', 'ip', 'device', 'changes', 'reason'];
    const lines = rows.map((row) => {
      const event = this.present(row, labels);
      return [
        event.id,
        new Date(event.at).toISOString(),
        event.actor.name,
        event.actor.email,
        event.actor.role,
        event.action,
        event.summary,
        event.category,
        event.severity,
        event.outcome,
        event.target.type,
        event.target.id,
        event.target.label,
        event.ip,
        event.device,
        event.changes.map((change) => `${change.field}: ${change.before} -> ${change.after}`).join('; '),
        event.reason ?? '',
      ];
    });
    return { csv: toCsv([head, ...lines]), count: rows.length, truncated: rows.length === EXPORT_LIMIT };
  }
}