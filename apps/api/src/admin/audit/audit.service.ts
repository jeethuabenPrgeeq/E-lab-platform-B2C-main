import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs, type Paged } from '../common/pagination.js';
import type { AuditQueryDto } from './audit.dto.js';

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  changes?: unknown;
}

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(db: Db, actor: AdminActor, entry: AuditEntry) {
    return db.technicalAuditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        summary: entry.summary.slice(0, 500),
        changes:
          entry.changes === undefined
            ? undefined
            : (entry.changes as Prisma.InputJsonValue),
        ipAddress: actor.ip,
        userAgent: actor.userAgent ?? null,
      },
    });
  }

  async list(query: AuditQueryDto): Promise<Paged<unknown>> {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where: Prisma.TechnicalAuditLogWhereInput = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: { startsWith: query.action } } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.q
        ? {
            OR: [
              { summary: { contains: query.q, mode: 'insensitive' } },
              { actorEmail: { contains: query.q, mode: 'insensitive' } },
              { entityId: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.technicalAuditLog.findMany({
        where,
        orderBy: { createdAt: query.order ?? 'desc' },
        skip,
        take,
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.technicalAuditLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
