import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import type { AssignDto, CreateTicketDto, EscalateDto, PriorityKey, ReplyDto, TicketQueryDto, TicketStatusKey } from './support.dto.js';

const MIN = 60_000;
export const SLA_MINUTES: Record<PriorityKey, number> = { urgent: 60, high: 240, normal: 480, low: 1440 };
const ROLE_LABEL = { LEARNER: 'Learner', PLATFORM_ADMIN: 'Platform admin', SUPER_ADMIN: 'Super admin' } as const;
const STATUS_EVENT: Record<TicketStatusKey, string> = {
  new: 'Changed status to new',
  open: 'Changed status to open',
  pending: 'Set to pending. Waiting on the requester',
  resolved: 'Marked the ticket as resolved',
};

const LIST_INCLUDE = { assignee: { select: { id: true, name: true } } } as const;
type TicketRow = Prisma.SupportTicketGetPayload<{ include: typeof LIST_INCLUDE }>;

export function slaOf(ticket: Pick<TicketRow, 'priority' | 'createdAt' | 'firstResponseAt' | 'status'>, now = Date.now()) {
  const target = SLA_MINUTES[ticket.priority] * MIN;
  const dueAt = ticket.createdAt.getTime() + target;
  if (ticket.firstResponseAt) {
    const took = ticket.firstResponseAt.getTime() - ticket.createdAt.getTime();
    return { dueAt, breached: false, responded: true, late: took > target, responseMinutes: Math.round(took / MIN) };
  }
  if (ticket.status === 'resolved') return { dueAt, breached: false, responded: false, late: false, responseMinutes: null };
  return { dueAt, breached: now > dueAt, responded: false, late: now > dueAt, responseMinutes: null };
}

function present(row: TicketRow, now = Date.now()) {
  return {
    id: row.id,
    ref: `T-${row.number}`,
    subject: row.subject,
    requester: { name: row.requesterName, email: row.requesterEmail, role: row.requesterRole, org: row.requesterOrg },
    category: row.category,
    priority: row.priority,
    status: row.status,
    source: row.source,
    assignee: row.assignee ? { id: row.assignee.id, name: row.assignee.name } : null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    firstResponseAt: row.firstResponseAt?.getTime() ?? null,
    resolvedAt: row.resolvedAt?.getTime() ?? null,
    rating: row.rating,
    sla: slaOf(row, now),
  };
}

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async actorName(actor: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
    return user?.name ?? actor.email;
  }

  async list(query: TicketQueryDto, actor: AdminActor) {
    const tab = query.tab ?? 'unresolved';
    const where: Prisma.SupportTicketWhereInput = {
      ...(tab === 'all' ? {} : tab === 'unresolved' ? { status: { not: 'resolved' } } : { status: tab }),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.assignee === 'me' ? { assigneeId: actor.id } : query.assignee === 'none' ? { assigneeId: null } : {}),
      ...(query.q
        ? {
            OR: [
              { subject: { contains: query.q, mode: 'insensitive' } },
              { requesterEmail: { contains: query.q, mode: 'insensitive' } },
              { requesterName: { contains: query.q, mode: 'insensitive' } },
              ...(/^t?-?\d+$/i.test(query.q) ? [{ number: Number(query.q.replace(/\D/g, '')) }] : []),
            ],
          }
        : {}),
    };
    const now = Date.now();
    const [rows, byStatus, open] = await Promise.all([
      this.prisma.supportTicket.findMany({ where, include: LIST_INCLUDE }),
      this.prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.supportTicket.findMany({ where: { status: { not: 'resolved' } }, select: { priority: true, createdAt: true, firstResponseAt: true, status: true, assigneeId: true } }),
    ]);
    const items = rows.map((row) => present(row, now));
    const sort = query.sort ?? 'sla';
    items.sort((a, b) => {
      if (sort === 'newest') return b.createdAt - a.createdAt;
      if (sort === 'updated') return b.updatedAt - a.updatedAt;
      const aWaiting = a.status !== 'resolved' && !a.sla.responded;
      const bWaiting = b.status !== 'resolved' && !b.sla.responded;
      if (aWaiting !== bWaiting) return aWaiting ? -1 : 1;
      return a.sla.dueAt - b.sla.dueAt;
    });
    const { page, pageSize, skip, take } = pageArgs(query);
    return {
      items: items.slice(skip, skip + take),
      total: items.length,
      page,
      pageSize,
      statusCounts: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
      breached: open.filter((ticket) => slaOf(ticket, now).breached).length,
      unassigned: open.filter((ticket) => !ticket.assigneeId).length,
    };
  }

  async get(id: string) {
    const row = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: { ...LIST_INCLUDE, messages: { orderBy: { at: 'asc' } } },
    });
    if (!row) throw new NotFoundException('Ticket not found.');
    return {
      ...present(row),
      messages: row.messages.map((message) => ({ id: message.id, kind: message.kind, author: message.authorName, body: message.body, at: message.at.getTime() })),
    };
  }

  agents() {
    return this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }

  private async ticket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    return ticket;
  }

  async reply(id: string, dto: ReplyDto, actor: AdminActor) {
    const ticket = await this.ticket(id);
    const name = await this.actorName(actor);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.ticketMessage.create({ data: { ticketId: id, kind: 'agent', authorId: actor.id, authorName: name, body: dto.body.trim(), at: now } });
      if (dto.then !== 'open' && dto.then !== ticket.status) {
        await tx.ticketMessage.create({ data: { ticketId: id, kind: 'event', authorId: actor.id, authorName: name, body: STATUS_EVENT[dto.then], at: new Date(now.getTime() + 1) } });
      }
      await tx.supportTicket.update({
        where: { id },
        data: {
          status: dto.then,
          firstResponseAt: ticket.firstResponseAt ?? now,
          resolvedAt: dto.then === 'resolved' ? now : null,
          assigneeId: ticket.assigneeId ?? actor.id,
        },
      });
      await this.audit.record(tx, actor, { action: 'ticket.reply', entityType: 'support_ticket', entityId: id, summary: `Replied to T-${ticket.number}${dto.then !== 'open' ? ` and set it ${dto.then}` : ''}` });
    });
    return this.get(id);
  }

  async note(id: string, body: string, actor: AdminActor) {
    await this.ticket(id);
    const name = await this.actorName(actor);
    await this.prisma.$transaction(async (tx) => {
      await tx.ticketMessage.create({ data: { ticketId: id, kind: 'note', authorId: actor.id, authorName: name, body: body.trim() } });
      await tx.supportTicket.update({ where: { id }, data: { updatedAt: new Date() } });
    });
    return this.get(id);
  }

  async setStatus(id: string, status: TicketStatusKey, actor: AdminActor) {
    const ticket = await this.ticket(id);
    if (ticket.status === status) return this.get(id);
    if (status === 'new' && ticket.firstResponseAt) throw new BadRequestException('A ticket that has been replied to cannot go back to new.');
    const name = await this.actorName(actor);
    const now = new Date();
    const text = status === 'open' && ticket.status === 'resolved' ? 'Reopened the ticket' : STATUS_EVENT[status];
    await this.prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({ where: { id }, data: { status, resolvedAt: status === 'resolved' ? now : null } });
      await tx.ticketMessage.create({ data: { ticketId: id, kind: 'event', authorId: actor.id, authorName: name, body: text, at: now } });
      await this.audit.record(tx, actor, { action: 'ticket.status', entityType: 'support_ticket', entityId: id, summary: `T-${ticket.number}: ${text}` });
    });
    return this.get(id);
  }

  async setPriority(id: string, priority: PriorityKey, actor: AdminActor) {
    const ticket = await this.ticket(id);
    if (ticket.priority === priority) return this.get(id);
    const name = await this.actorName(actor);
    await this.prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({ where: { id }, data: { priority } });
      await tx.ticketMessage.create({ data: { ticketId: id, kind: 'event', authorId: actor.id, authorName: name, body: `Changed priority to ${priority}` } });
      await this.audit.record(tx, actor, { action: 'ticket.priority', entityType: 'support_ticket', entityId: id, summary: `T-${ticket.number}: priority ${ticket.priority} to ${priority}` });
    });
    return this.get(id);
  }

  async assign(id: string, dto: AssignDto, actor: AdminActor) {
    const ticket = await this.ticket(id);
    const assigneeId = dto.assigneeId || null;
    if (ticket.assigneeId === assigneeId) return this.get(id);
    let assigneeName: string | null = null;
    if (assigneeId) {
      const agent = await this.prisma.user.findFirst({ where: { id: assigneeId, role: 'SUPER_ADMIN', status: 'ACTIVE' }, select: { name: true } });
      if (!agent) throw new BadRequestException('Tickets can only be assigned to an active super admin.');
      assigneeName = agent.name;
    }
    const name = await this.actorName(actor);
    const text = assigneeId ? `Assigned to ${assigneeId === actor.id ? 'themselves' : assigneeName}` : 'Removed the assignee';
    await this.prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({ where: { id }, data: { assigneeId } });
      await tx.ticketMessage.create({ data: { ticketId: id, kind: 'event', authorId: actor.id, authorName: name, body: text } });
      await this.audit.record(tx, actor, { action: 'ticket.assign', entityType: 'support_ticket', entityId: id, summary: `T-${ticket.number}: ${text}` });
    });
    return this.get(id);
  }

  async createForUser(userId: string, dto: CreateTicketDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true } });
    if (!user) throw new NotFoundException('User not found.');
    const ticket = await this.prisma.supportTicket.create({
      data: {
        subject: dto.subject.trim(),
        category: dto.category,
        requesterId: user.id,
        requesterName: user.name,
        requesterEmail: user.email,
        requesterRole: ROLE_LABEL[user.role],
        requesterOrg: dto.org?.trim() ?? '',
        messages: { create: { kind: 'requester', authorId: user.id, authorName: user.name, body: dto.body.trim() } },
      },
    });
    return { id: ticket.id, ref: `T-${ticket.number}`, status: ticket.status };
  }

  async escalate(dto: EscalateDto, actor: AdminActor) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { id: true, name: true, email: true } });
    if (!user) throw new NotFoundException('User not found.');
    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          subject: dto.subject.trim(),
          category: dto.category ?? 'technical',
          priority: dto.priority,
          source: 'platform_admin',
          requesterId: user.id,
          requesterName: user.name,
          requesterEmail: user.email,
          requesterRole: 'Platform admin',
          requesterOrg: 'eLab technical team',
          messages: { create: { kind: 'requester', authorId: user.id, authorName: user.name, body: dto.body.trim() } },
        },
      });
      await this.audit.record(tx, actor, { action: 'ticket.escalate', entityType: 'support_ticket', entityId: created.id, summary: `Escalated T-${created.number} to Super Admin: ${dto.subject.trim()}` });
      return created;
    });
    return { id: ticket.id, ref: `T-${ticket.number}`, status: ticket.status };
  }
}