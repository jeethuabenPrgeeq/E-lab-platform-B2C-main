import { Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { cleanIp, readChanges, severityOf, toCsv } from '../audit/events.js';
import { pageArgs } from '../common/pagination.js';

export const PLATFORM_CATEGORIES = ['content', 'runtime', 'judge', 'monitoring', 'support', 'release', 'auth'] as const;
export const PLATFORM_RANGES = ['24h', '7d', '30d'] as const;
export type PlatformCategory = (typeof PLATFORM_CATEGORIES)[number];
export type PlatformRange = (typeof PLATFORM_RANGES)[number];

const RANGE_MS: Record<PlatformRange, number> = { '24h': 86_400_000, '7d': 7 * 86_400_000, '30d': 30 * 86_400_000 };
const EXPORT_LIMIT = 10_000;

const TYPES: Record<Exclude<PlatformCategory, 'judge' | 'monitoring'>, string[]> = {
  content: ['problem', 'technology', 'test_case', 'source_check'],
  runtime: ['runtime'],
  support: ['problem_report', 'tech_ticket', 'support_ticket'],
  release: ['release'],
  auth: ['auth'],
};
const JUDGE_TYPES = ['judge_worker', 'code_run'];
const MONITOR_TYPES = ['incident', 'rejudge_job', 'plagiarism_flag'];
const SCOPE_TYPES = [...TYPES.content, ...TYPES.runtime, ...TYPES.release, 'problem_report', 'tech_ticket', 'judge_settings', ...JUDGE_TYPES, ...MONITOR_TYPES];

const CATEGORY_WHERE: Record<PlatformCategory, Prisma.TechnicalAuditLogWhereInput> = {
  content: { entityType: { in: TYPES.content } },
  runtime: { entityType: { in: TYPES.runtime } },
  support: { entityType: { in: TYPES.support } },
  release: { entityType: { in: TYPES.release } },
  auth: { entityType: 'auth' },
  judge: { OR: [{ entityType: { in: JUDGE_TYPES } }, { entityType: 'judge_settings', NOT: { action: { startsWith: 'exec.' } } }] },
  monitoring: { OR: [{ entityType: { in: MONITOR_TYPES } }, { entityType: 'judge_settings', action: { startsWith: 'exec.' } }] },
};

function categoryOf(entityType: string, action: string): PlatformCategory {
  if (entityType === 'judge_settings') return action.startsWith('exec.') ? 'monitoring' : 'judge';
  if (JUDGE_TYPES.includes(entityType)) return 'judge';
  if (MONITOR_TYPES.includes(entityType)) return 'monitoring';
  for (const [category, types] of Object.entries(TYPES)) if (types.includes(entityType)) return category as PlatformCategory;
  return 'content';
}

const INCLUDE = { actor: { select: { name: true, email: true, role: true } } } as const;
type Row = Prisma.TechnicalAuditLogGetPayload<{ include: typeof INCLUDE }>;

export interface PlatformAuditQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  order?: 'asc' | 'desc';
  category?: PlatformCategory;
  result?: 'success' | 'failure';
  sensitive?: boolean;
  actor?: string;
  range?: PlatformRange;
}

@Injectable()
export class PlatformAuditService {
  constructor(private readonly prisma: PrismaService) {}

  private scope(): Prisma.TechnicalAuditLogWhereInput {
    return { OR: [{ entityType: { in: SCOPE_TYPES } }, { actor: { role: 'PLATFORM_ADMIN' } }] };
  }

  private where(query: PlatformAuditQuery): Prisma.TechnicalAuditLogWhereInput {
    const and: Prisma.TechnicalAuditLogWhereInput[] = [this.scope(), { createdAt: { gte: new Date(Date.now() - RANGE_MS[query.range ?? '7d']) } }];
    if (query.category) and.push(CATEGORY_WHERE[query.category]);
    if (query.result) and.push(query.result === 'failure' ? { outcome: 'failure' } : { NOT: { outcome: 'failure' } });
    if (query.actor) and.push({ OR: [{ actorEmail: { equals: query.actor, mode: 'insensitive' } }, { actor: { name: { equals: query.actor, mode: 'insensitive' } } }] });
    if (query.sensitive) and.push({ OR: [{ action: { startsWith: 'auth.' } }, { action: { in: SENSITIVE_ACTIONS } }] });
    if (query.q) {
      and.push({
        OR: [
          { summary: { contains: query.q, mode: 'insensitive' } },
          { action: { contains: query.q, mode: 'insensitive' } },
          { actorEmail: { contains: query.q, mode: 'insensitive' } },
          { entityId: { contains: query.q } },
          { id: { endsWith: query.q.replace(/^req_/, '') } },
        ],
      });
    }
    return { AND: and };
  }

  private async labels(rows: Row[]) {
    const ids = (types: string[]) => [...new Set(rows.filter((row) => types.includes(row.entityType)).map((row) => row.entityId))];
    const [problems, technologies, workers, runtimes, reports, tickets, incidents, releases, users, supportTickets] = await Promise.all([
      this.prisma.problem.findMany({ where: { id: { in: ids(['problem']) } }, select: { id: true, title: true } }),
      this.prisma.technology.findMany({ where: { id: { in: ids(['technology']) } }, select: { id: true, name: true } }),
      this.prisma.judgeWorker.findMany({ where: { id: { in: ids(['judge_worker']) } }, select: { id: true, name: true } }),
      this.prisma.runtimeEntry.findMany({ where: { id: { in: ids(['runtime']) } }, select: { id: true, data: true } }),
      this.prisma.problemReport.findMany({ where: { id: { in: ids(['problem_report']) } }, select: { id: true, number: true, title: true } }),
      this.prisma.techTicket.findMany({ where: { id: { in: ids(['tech_ticket']) } }, select: { id: true, number: true, subject: true } }),
      this.prisma.incident.findMany({ where: { id: { in: ids(['incident']) } }, select: { id: true, number: true, title: true } }),
      this.prisma.release.findMany({ where: { id: { in: ids(['release']) } }, select: { id: true, version: true } }),
      this.prisma.user.findMany({ where: { id: { in: ids(['auth']) } }, select: { id: true, name: true } }),
      this.prisma.supportTicket.findMany({ where: { id: { in: ids(['support_ticket']) } }, select: { id: true, number: true, subject: true } }),
    ]);
    const map = new Map<string, string>();
    for (const item of problems) map.set(item.id, item.title);
    for (const item of technologies) map.set(item.id, item.name);
    for (const item of workers) map.set(item.id, item.name);
    for (const item of runtimes) {
      const data = item.data as { name?: string; tag?: string; version?: string };
      map.set(item.id, data.tag ? `${data.name}:${data.tag}` : (data.name ?? data.version ?? item.id));
    }
    for (const item of reports) map.set(item.id, `PR-${item.number} ${item.title}`);
    for (const item of tickets) map.set(item.id, `TS-${item.number} ${item.subject}`);
    for (const item of incidents) map.set(item.id, `INC-${item.number} ${item.title}`);
    for (const item of releases) map.set(item.id, item.version);
    for (const item of users) map.set(item.id, item.name);
    for (const item of supportTickets) map.set(item.id, `T-${item.number} ${item.subject}`);
    return map;
  }

  private present(row: Row, labels: Map<string, string>) {
    const { changes, reason } = readChanges(row.action, row.changes);
    const system = row.actorEmail === 'system';
    const failure = row.outcome === 'failure';
    return {
      id: row.id,
      at: row.createdAt.getTime(),
      actor: { name: row.actor?.name ?? (system ? 'System' : row.actorEmail), email: row.actor?.email ?? (system ? null : row.actorEmail), role: system ? 'System' : row.actor?.role === 'SUPER_ADMIN' ? 'Super admin' : 'Platform admin' },
      category: categoryOf(row.entityType, row.action),
      action: row.action,
      summary: row.summary,
      target: { type: row.entityType, id: row.entityId, label: labels.get(row.entityId) ?? row.entityId },
      result: failure ? 'failure' : 'success',
      error: failure ? (reason ?? row.summary) : null,
      sensitive: isSensitive(row.action),
      ip: cleanIp(row.ipAddress) ?? (system ? 'internal' : '—'),
      userAgent: row.userAgent ?? (system ? 'eLab scheduler' : '—'),
      requestId: `req_${row.id.slice(-12)}`,
      changes,
      reason,
    };
  }

  async list(query: PlatformAuditQuery) {
    const where = this.where(query);
    const { page, pageSize, skip, take } = pageArgs(query);
    const [rows, total, failures, byCategory, actors] = await Promise.all([
      this.prisma.technicalAuditLog.findMany({ where, orderBy: { createdAt: query.order ?? 'desc' }, skip, take, include: INCLUDE }),
      this.prisma.technicalAuditLog.count({ where }),
      this.prisma.technicalAuditLog.count({ where: { AND: [where, { outcome: 'failure' }] } }),
      Promise.all(PLATFORM_CATEGORIES.map((category) => this.prisma.technicalAuditLog.count({ where: { AND: [this.where({ ...query, category: undefined }), CATEGORY_WHERE[category]] } }))),
      this.prisma.technicalAuditLog.groupBy({ by: ['actorEmail'], where, _count: { _all: true }, orderBy: { _count: { actorEmail: 'desc' } }, take: 50 }),
    ]);
    const labels = await this.labels(rows);
    return {
      items: rows.map((row) => this.present(row, labels)),
      total,
      page,
      pageSize,
      summary: { failures, byCategory: Object.fromEntries(PLATFORM_CATEGORIES.map((category, index) => [category, byCategory[index]])) },
      actors: actors.map((item) => ({ email: item.actorEmail, events: item._count._all })),
    };
  }

  async get(id: string) {
    const row = await this.prisma.technicalAuditLog.findFirst({ where: { AND: [{ id }, this.scope()] }, include: INCLUDE });
    if (!row) throw new NotFoundException('Event not found.');
    const related = await this.prisma.technicalAuditLog.findMany({ where: { entityType: row.entityType, entityId: row.entityId, id: { not: id } }, orderBy: { createdAt: 'desc' }, take: 10, include: INCLUDE });
    const labels = await this.labels([row, ...related]);
    return { ...this.present(row, labels), related: related.map((item) => this.present(item, labels)) };
  }

  async exportCsv(query: PlatformAuditQuery) {
    const rows = await this.prisma.technicalAuditLog.findMany({ where: this.where(query), orderBy: { createdAt: 'desc' }, take: EXPORT_LIMIT, include: INCLUDE });
    const labels = await this.labels(rows);
    const head = ['event_id', 'request_id', 'time_utc', 'actor', 'actor_role', 'category', 'action', 'summary', 'result', 'error', 'sensitive', 'target_type', 'target_id', 'target', 'ip', 'user_agent', 'changes'];
    const lines = rows.map((row) => {
      const event = this.present(row, labels);
      return [
        event.id,
        event.requestId,
        new Date(event.at).toISOString(),
        event.actor.name,
        event.actor.role,
        event.category,
        event.action,
        event.summary,
        event.result,
        event.error ?? '',
        event.sensitive ? 'yes' : 'no',
        event.target.type,
        event.target.id,
        event.target.label,
        event.ip,
        event.userAgent,
        event.changes.map((change) => `${change.field}: ${change.before} -> ${change.after}`).join('; '),
      ];
    });
    return { csv: toCsv([head, ...lines]), count: rows.length, truncated: rows.length === EXPORT_LIMIT };
  }
}

const SENSITIVE_ACTIONS = [
  'judge.limits',
  'judge.queue_pause',
  'judge.worker_remove',
  'judge.job_cancel',
  'submission.override',
  'submission.rejudge',
  'plagiarism.confirmed',
  'release.rollback',
  'release.promote',
  'incident.declare',
  'tech_ticket.escalate',
  'problem.unpublish',
  'problem.deprecate',
  'runtime.delete',
];

function isSensitive(action: string) {
  return action.startsWith('auth.') || SENSITIVE_ACTIONS.includes(action) || severityOf(action) === 'critical';
}