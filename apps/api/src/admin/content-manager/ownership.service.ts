import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import type { AssignProblemDto, OwnershipQueryDto } from './ownership.dto.js';

const PERSON = { select: { id: true, name: true, email: true } } as const;
const SELECT = {
  id: true,
  slug: true,
  title: true,
  status: true,
  difficulty: true,
  updatedAt: true,
  assignedAt: true,
  technology: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  assignee: PERSON,
} as const;
type Row = Prisma.ProblemGetPayload<{ select: typeof SELECT }>;
const ROLE_LABEL: Record<string, string> = { CONTENT_MANAGER: 'Content manager', PLATFORM_ADMIN: 'Platform admin', SUPER_ADMIN: 'Super admin', LEARNER: 'Learner' };

function present(row: Row) {
  return {
    ...row,
    difficulty: row.difficulty.toLowerCase(),
    updatedAt: row.updatedAt.getTime(),
    assignedAt: row.assignedAt?.getTime() ?? null,
    createdBy: row.createdBy ? { id: row.createdBy.id, name: row.createdBy.name, email: row.createdBy.email, role: ROLE_LABEL[row.createdBy.role] ?? row.createdBy.role } : null,
  };
}

@Injectable()
export class OwnershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: OwnershipQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where: Prisma.ProblemWhereInput = {
      AND: [
        query.status ? { status: query.status } : {},
        query.assignee === 'none' ? { assigneeId: null } : query.assignee ? { assigneeId: query.assignee } : {},
        query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { slug: { contains: query.q, mode: 'insensitive' } }] } : {},
      ],
    };
    const [rows, total, unassigned] = await Promise.all([
      this.prisma.problem.findMany({ where, orderBy: { updatedAt: query.order ?? 'desc' }, skip, take, select: SELECT }),
      this.prisma.problem.count({ where }),
      this.prisma.problem.count({ where: { assigneeId: null, status: { not: 'deprecated' } } }),
    ]);
    return { items: rows.map(present), total, page, pageSize, unassigned };
  }

  async contentManagers() {
    const users = await this.prisma.user.findMany({ where: { role: 'CONTENT_MANAGER', status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true } });
    const counts = await this.prisma.problem.groupBy({ by: ['assigneeId'], where: { assigneeId: { in: users.map((user) => user.id) } }, _count: { _all: true } });
    return { items: users.map((user) => ({ ...user, assigned: counts.find((row) => row.assigneeId === user.id)?._count._all ?? 0 })) };
  }

  async assign(id: string, dto: AssignProblemDto, actor: AdminActor) {
    const problem = await this.prisma.problem.findUnique({ where: { id }, select: { id: true, title: true, assigneeId: true, assignee: { select: { name: true } } } });
    if (!problem) throw new NotFoundException('Problem not found.');
    const nextId = dto.assigneeId ?? null;
    if (nextId !== problem.assigneeId) {
      let nextName: string | null = null;
      if (nextId) {
        const user = await this.prisma.user.findFirst({ where: { id: nextId, role: 'CONTENT_MANAGER', status: 'ACTIVE' }, select: { name: true } });
        if (!user) throw new BadRequestException('Pick an active content manager.');
        nextName = user.name;
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.problem.update({ where: { id }, data: { assigneeId: nextId, assignedAt: nextId ? new Date() : null } });
        await this.audit.record(tx, actor, {
          action: 'problem.assign',
          entityType: 'problem',
          entityId: id,
          summary: nextName ? `Assigned ${problem.title} to ${nextName}` : `Removed the assignee from ${problem.title}`,
          changes: { fields: [{ field: 'Assignee', before: problem.assignee?.name ?? 'Unassigned', after: nextName ?? 'Unassigned' }], ...(dto.reason ? { reason: dto.reason.trim() } : {}) },
        });
      });
    }
    return present(await this.prisma.problem.findUniqueOrThrow({ where: { id }, select: SELECT }));
  }
}
