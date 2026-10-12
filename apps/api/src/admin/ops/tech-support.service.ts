import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { SupportService } from '../support/support.service.js';
import { ms, OpsDirectory } from './ops.common.js';

export const TICKET_STATUSES = ['new', 'open', 'pending', 'resolved'] as const;
export const TICKET_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;
export const TICKET_CATEGORIES = ['login', 'ide', 'judge', 'assessment', 'account', 'other'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

const SLA_MIN: Record<TicketPriority, number> = { urgent: 60, high: 240, normal: 480, low: 1440 };
const RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
const STATUS_LABEL: Record<TicketStatus, string> = { new: 'New', open: 'Open', pending: 'Pending', resolved: 'Resolved' };
const REOPEN_WINDOW = 7 * 86_400_000;
const MIN = 60_000;

const INCLUDE = { messages: { orderBy: { at: 'asc' } } } as const satisfies Prisma.TechTicketInclude;
type Row = Prisma.TechTicketGetPayload<{ include: typeof INCLUDE }>;

const ROLE_LABEL: Record<string, string> = { LEARNER: 'Learner', PLATFORM_ADMIN: 'Institution admin', SUPER_ADMIN: 'Institution admin' };

export interface TicketListQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignee?: string;
  breached?: boolean;
}

export function slaBreached(row: { priority: string; status: string; createdAt: Date; firstResponseAt: Date | null }, now = Date.now()) {
  return !row.firstResponseAt && row.status !== 'resolved' && row.createdAt.getTime() + (SLA_MIN[row.priority as TicketPriority] ?? 480) * MIN < now;
}

@Injectable()
export class TechSupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly directory: OpsDirectory,
    private readonly support: SupportService,
  ) {}

  private present(row: Row, forRequester = false) {
    return {
      id: row.id,
      ref: `TS-${row.number}`,
      subject: row.subject,
      requester: { name: row.requesterName, email: row.requesterEmail, role: row.requesterRole, org: row.requesterOrg },
      category: row.category,
      priority: row.priority,
      status: row.status,
      assignee: row.assigneeName,
      assigneeId: row.assigneeId,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
      firstResponseAt: ms(row.firstResponseAt),
      resolvedAt: ms(row.resolvedAt),
      rating: row.rating,
      slaDueAt: row.createdAt.getTime() + (SLA_MIN[row.priority as TicketPriority] ?? 480) * MIN,
      breached: slaBreached(row),
      escalatedTicketId: forRequester ? undefined : row.escalatedTicketId,
      messages: row.messages
        .filter((message) => !forRequester || message.kind !== 'note')
        .map((message) => ({ id: message.id, kind: message.kind, author: message.authorName, body: message.body, at: message.at.getTime() })),
    };
  }

  private async load(id: string) {
    const row = await this.prisma.techTicket.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException('Ticket not found.');
    return row;
  }

  async create(userId: string, input: { subject: string; category: TicketCategory; body: string; priority?: 'low' | 'normal' | 'high' }) {
    const user = await this.directory.person(userId);
    const open = await this.prisma.techTicket.count({ where: { requesterId: userId, status: { not: 'resolved' } } });
    if (open >= 5) throw new HttpException('You already have 5 open tickets. Reply on one of those or wait for them to close.', HttpStatus.TOO_MANY_REQUESTS);
    const row = await this.prisma.techTicket.create({
      data: {
        subject: input.subject.trim(),
        category: input.category,
        priority: input.priority ?? 'normal',
        requesterId: user.id,
        requesterName: user.name,
        requesterEmail: user.email,
        requesterRole: ROLE_LABEL[user.role] ?? 'Learner',
        messages: { create: { kind: 'requester', authorId: user.id, authorName: user.name, body: input.body.trim() } },
      },
      include: INCLUDE,
    });
    return this.present(row, true);
  }

  async mine(userId: string) {
    const rows = await this.prisma.techTicket.findMany({ where: { requesterId: userId }, include: INCLUDE, orderBy: { updatedAt: 'desc' }, take: 50 });
    return rows.map((row) => this.present(row, true));
  }

  private async own(userId: string, id: string) {
    const row = await this.load(id);
    if (row.requesterId !== userId) throw new ForbiddenException('This ticket is not yours.');
    return row;
  }

  async mineOne(userId: string, id: string) {
    return this.present(await this.own(userId, id), true);
  }

  async requesterReply(userId: string, id: string, body: string) {
    const row = await this.own(userId, id);
    if (row.status === 'resolved' && row.resolvedAt && Date.now() - row.resolvedAt.getTime() > REOPEN_WINDOW) throw new BadRequestException('This ticket was closed over 7 days ago. Please open a new one.');
    const next = row.status === 'new' ? 'new' : 'open';
    await this.prisma.$transaction(async (tx) => {
      await tx.techTicketMessage.create({ data: { ticketId: id, kind: 'requester', authorId: userId, authorName: row.requesterName, body: body.trim() } });
      if (next !== row.status) await tx.techTicketMessage.create({ data: { ticketId: id, kind: 'event', authorName: row.requesterName, body: row.status === 'resolved' ? 'Reopened by requester reply' : `Status changed to ${STATUS_LABEL[next]}` } });
      await tx.techTicket.update({ where: { id }, data: { status: next, ...(row.status === 'resolved' ? { resolvedAt: null, rating: null } : {}) } });
      await this.directory.notify(tx, [row.assigneeId], `New reply on TS-${row.number}`, body.trim(), `/platform-admin/tech-support?ticket=${id}`);
    });
    return this.present(await this.load(id), true);
  }

  async rate(userId: string, id: string, rating: number) {
    const row = await this.own(userId, id);
    if (row.status !== 'resolved') throw new BadRequestException('You can rate a ticket once it is resolved.');
    if (row.rating !== null) throw new ConflictException('You already rated this ticket.');
    await this.prisma.$transaction([
      this.prisma.techTicket.update({ where: { id }, data: { rating } }),
      this.prisma.techTicketMessage.create({ data: { ticketId: id, kind: 'event', authorName: row.requesterName, body: `Rated the support ${rating}/5` } }),
    ]);
    return this.present(await this.load(id), true);
  }

  async list(query: TicketListQuery, actor: AdminActor) {
    const and: Prisma.TechTicketWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.priority) and.push({ priority: query.priority });
    if (query.category) and.push({ category: query.category });
    if (query.assignee === 'me') and.push({ assigneeId: actor.id });
    else if (query.assignee === 'none') and.push({ assigneeId: null });
    else if (query.assignee) and.push({ assigneeId: query.assignee });
    if (query.q) {
      const number = Number(query.q.replace(/^TS-/i, ''));
      and.push({
        OR: [
          { subject: { contains: query.q, mode: 'insensitive' } },
          { requesterName: { contains: query.q, mode: 'insensitive' } },
          { requesterEmail: { contains: query.q, mode: 'insensitive' } },
          { requesterOrg: { contains: query.q, mode: 'insensitive' } },
          ...(Number.isInteger(number) && number > 0 ? [{ number }] : []),
        ],
      });
    }
    const rows = await this.prisma.techTicket.findMany({ where: { AND: and }, include: INCLUDE, orderBy: { updatedAt: 'desc' }, take: 1000 });
    let items = rows.map((row) => this.present(row));
    if (query.breached) items = items.filter((item) => item.breached);
    const active = (status: string) => (status === 'resolved' ? 1 : 0);
    items.sort((a, b) => active(a.status) - active(b.status) || Number(b.breached) - Number(a.breached) || RANK[a.priority] - RANK[b.priority] || b.updatedAt - a.updatedAt);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const [counts, rated, responded] = await Promise.all([
      this.prisma.techTicket.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.techTicket.aggregate({ where: { rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } }),
      this.prisma.techTicket.findMany({ where: { firstResponseAt: { not: null }, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, select: { createdAt: true, firstResponseAt: true } }),
    ]);
    const waits = responded.map((row) => row.firstResponseAt!.getTime() - row.createdAt.getTime()).sort((a, b) => a - b);
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
      counts: Object.fromEntries(TICKET_STATUSES.map((status) => [status, counts.find((row) => row.status === status)?._count._all ?? 0])),
      stats: {
        breached: rows.filter((row) => slaBreached(row)).length,
        medianFirstResponseMs: waits.length ? waits[Math.floor(waits.length / 2)] : null,
        avgRating: rated._avg.rating === null ? null : Math.round(rated._avg.rating * 10) / 10,
        ratings: rated._count.rating,
      },
    };
  }

  async get(id: string) {
    return this.present(await this.load(id));
  }

  private async change(id: string, actor: AdminActor, fn: (row: Row, name: string, tx: Prisma.TransactionClient) => Promise<{ action: string; summary: string; changes?: unknown }>) {
    const row = await this.load(id);
    const me = await this.directory.person(actor.id);
    await this.prisma.$transaction(async (tx) => {
      const entry = await fn(row, me.name, tx);
      await tx.techTicket.update({ where: { id }, data: { updatedAt: new Date() } });
      await this.audit.record(tx, actor, { ...entry, entityType: 'tech_ticket', entityId: id, summary: `TS-${row.number}: ${entry.summary}` });
    });
    return this.get(id);
  }

  private statusData(row: Row, next: TicketStatus) {
    return next === 'resolved' ? { status: next, resolvedAt: new Date() } : { status: next, resolvedAt: null, ...(row.status === 'resolved' ? { rating: null } : {}) };
  }

  reply(id: string, body: string, then: Exclude<TicketStatus, 'new'>, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      const now = new Date();
      await tx.techTicketMessage.create({ data: { ticketId: id, kind: 'agent', authorId: actor.id, authorName: name, body: body.trim(), at: now } });
      if (then !== row.status) await tx.techTicketMessage.create({ data: { ticketId: id, kind: 'event', authorName: name, body: `Status changed to ${STATUS_LABEL[then]}`, at: new Date(now.getTime() + 1) } });
      await tx.techTicket.update({
        where: { id },
        data: { ...this.statusData(row, then), ...(row.firstResponseAt ? {} : { firstResponseAt: now }), ...(row.assigneeId ? {} : { assigneeId: actor.id, assigneeName: name }) },
      });
      await this.directory.notify(tx, [row.requesterId], `Reply on your ticket TS-${row.number}`, body.trim(), `/support/technical/${id}`);
      return { action: 'tech_ticket.reply', summary: then === row.status ? 'Replied to requester' : `Replied and set ${STATUS_LABEL[then]}`, changes: then === row.status ? undefined : [{ field: 'Status', before: row.status, after: then }] };
    });
  }

  note(id: string, body: string, actor: AdminActor) {
    return this.change(id, actor, async (_row, name, tx) => {
      await tx.techTicketMessage.create({ data: { ticketId: id, kind: 'note', authorId: actor.id, authorName: name, body: body.trim() } });
      return { action: 'tech_ticket.note', summary: 'Added an internal note' };
    });
  }

  setStatus(id: string, status: TicketStatus, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      if (row.status === status) throw new BadRequestException(`Already ${STATUS_LABEL[status]}.`);
      if (status === 'new') throw new BadRequestException('A ticket cannot go back to New.');
      await tx.techTicket.update({ where: { id }, data: this.statusData(row, status) });
      await tx.techTicketMessage.create({ data: { ticketId: id, kind: 'event', authorName: name, body: `Status changed to ${STATUS_LABEL[status]}` } });
      if (status === 'resolved') await this.directory.notify(tx, [row.requesterId], `Ticket TS-${row.number} resolved`, 'Let us know how we did by rating the support.', `/support/technical/${id}`);
      return { action: 'tech_ticket.status', summary: `Set ${STATUS_LABEL[status]}`, changes: [{ field: 'Status', before: row.status, after: status }] };
    });
  }

  setPriority(id: string, priority: TicketPriority, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      if (row.priority === priority) throw new BadRequestException('Priority unchanged.');
      await tx.techTicket.update({ where: { id }, data: { priority } });
      await tx.techTicketMessage.create({ data: { ticketId: id, kind: 'event', authorName: name, body: `Priority changed to ${priority}` } });
      return { action: 'tech_ticket.priority', summary: `Priority ${row.priority} → ${priority}`, changes: [{ field: 'Priority', before: row.priority, after: priority }] };
    });
  }

  assign(id: string, assigneeId: string | null, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      const person = await this.directory.teammate(assigneeId);
      if ((person?.id ?? null) === row.assigneeId) throw new BadRequestException('Already assigned that way.');
      await tx.techTicket.update({ where: { id }, data: { assigneeId: person?.id ?? null, assigneeName: person?.name ?? null } });
      const text = person ? `Assigned to ${person.name}` : 'Removed the assignee';
      await tx.techTicketMessage.create({ data: { ticketId: id, kind: 'event', authorName: name, body: text } });
      if (person && person.id !== actor.id) await this.directory.notify(tx, [person.id], `TS-${row.number} assigned to you`, row.subject, `/platform-admin/tech-support?ticket=${id}`);
      return { action: 'tech_ticket.assign', summary: text, changes: [{ field: 'Assignee', before: row.assigneeName, after: person?.name ?? null }] };
    });
  }

  async escalate(id: string, note: string, actor: AdminActor) {
    const row = await this.load(id);
    if (row.escalatedTicketId) throw new ConflictException('This ticket was already escalated to Super Admin.');
    const history = row.messages
      .filter((message) => message.kind === 'requester' || message.kind === 'agent')
      .slice(-6)
      .map((message) => `${message.authorName}: ${message.body}`)
      .join('\n\n');
    const created = await this.support.escalate(
      {
        subject: `[TS-${row.number}] ${row.subject}`.slice(0, 160),
        body: `${note.trim()}\n\nRequester: ${row.requesterName} <${row.requesterEmail}> (${row.requesterRole}${row.requesterOrg ? `, ${row.requesterOrg}` : ''})\n\n${history}`.slice(0, 5000),
        priority: row.priority as TicketPriority,
        category: row.category === 'account' ? 'account' : 'technical',
      },
      actor,
    );
    return this.change(id, actor, async (_row, name, tx) => {
      await tx.techTicket.update({ where: { id }, data: { escalatedTicketId: created.id } });
      await tx.techTicketMessage.create({ data: { ticketId: id, kind: 'event', authorName: name, body: `Escalated to Super Admin as ${created.ref}` } });
      return { action: 'tech_ticket.escalate', summary: `Escalated to Super Admin as ${created.ref}` };
    });
  }
}