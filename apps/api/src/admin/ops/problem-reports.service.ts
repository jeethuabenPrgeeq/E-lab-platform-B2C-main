import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { languageName, problemTitles } from '../platform/runs.js';
import { ms, OpsDirectory } from './ops.common.js';

export const REPORT_CATEGORIES = ['wrong_testcase', 'wrong_output', 'unclear_statement', 'compiler', 'typo', 'other'] as const;
export const REPORT_STATUSES = ['open', 'in_review', 'resolved', 'rejected'] as const;
export const RESOLUTIONS = { fixed_testcase: 'resolved', updated_statement: 'resolved', fixed_runtime: 'resolved', not_a_bug: 'rejected', duplicate: 'rejected' } as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ResolutionType = keyof typeof RESOLUTIONS;

const TECHNICAL = new Set<string>(['wrong_testcase', 'wrong_output', 'compiler']);
const CATEGORY_LABEL: Record<ReportCategory, string> = {
  wrong_testcase: 'Wrong test case',
  wrong_output: 'Expected output wrong',
  unclear_statement: 'Unclear statement',
  compiler: 'Language / compiler',
  typo: 'Typo or formatting',
  other: 'Other',
};
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;
const DAY = 86_400_000;
const DAILY_LIMIT = 20;

const INCLUDE = { entries: { orderBy: { at: 'asc' } }, events: { orderBy: { at: 'asc' } } } as const satisfies Prisma.ProblemReportInclude;
type Row = Prisma.ProblemReportGetPayload<{ include: typeof INCLUDE }>;

export function priorityOf(category: string, count: number) {
  if (count >= 5 || (TECHNICAL.has(category) && count >= 3)) return 'high' as const;
  if (count >= 2 || TECHNICAL.has(category)) return 'medium' as const;
  return 'low' as const;
}

export interface ReportListQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  assignee?: string;
}

@Injectable()
export class ProblemReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly directory: OpsDirectory,
  ) {}

  private present(row: Row, titles: Map<string, { title: string; difficulty: string | null }>) {
    const problem = titles.get(row.problemSlug);
    return {
      id: row.id,
      ref: `PR-${row.number}`,
      title: row.title,
      problem: problem?.title ?? row.problemSlug,
      problemSlug: row.problemSlug,
      difficulty: problem?.difficulty ?? 'medium',
      category: row.category,
      status: row.status,
      priority: priorityOf(row.category, row.entries.length),
      assignee: row.assigneeName,
      assigneeId: row.assigneeId,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
      reports: row.entries.map((entry) => ({ learner: entry.learnerName, at: entry.at.getTime(), message: entry.message, submissionId: entry.submissionId, language: entry.language })),
      activity: row.events.map((event) => ({ at: event.at.getTime(), actor: event.actorName, text: event.text, kind: event.kind })),
      resolution: row.resolutionType ? { type: row.resolutionType, note: row.resolutionNote ?? '', at: ms(row.resolvedAt) ?? row.updatedAt.getTime() } : null,
    };
  }

  private async load(id: string) {
    const row = await this.prisma.problemReport.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw new NotFoundException('Report not found.');
    return row;
  }

  private async one(id: string) {
    const row = await this.load(id);
    return this.present(row, await problemTitles(this.prisma, [row.problemSlug]));
  }

  async submit(userId: string, slug: string, input: { category: ReportCategory; message: string; submissionId?: string | null; language?: string | null }) {
    const user = await this.directory.person(userId);
    const message = input.message.trim();
    if (message.length < 10) throw new BadRequestException({ message: 'Tell us a little more.', issues: { message: 'At least 10 characters' } });
    const titles = await problemTitles(this.prisma, [slug]);
    if (!/^[a-z0-9][a-z0-9-]{1,118}$/.test(slug)) throw new NotFoundException('Problem not found.');
    const today = await this.prisma.problemReportEntry.count({ where: { userId, at: { gte: new Date(Date.now() - DAY) } } });
    if (today >= DAILY_LIMIT) throw new HttpException(`You can send up to ${DAILY_LIMIT} reports a day.`, HttpStatus.TOO_MANY_REQUESTS);
    if (input.submissionId) {
      const run = await this.prisma.codeRun.findFirst({ where: { id: input.submissionId, userId, problemSlug: slug }, select: { id: true } });
      if (!run) throw new BadRequestException({ message: 'That submission is not yours or is for another problem.', issues: { submissionId: 'Unknown submission' } });
    }
    const recent = await this.prisma.problemReportEntry.findFirst({ where: { userId, at: { gte: new Date(Date.now() - DAY) }, report: { problemSlug: slug, category: input.category } } });
    if (recent) throw new HttpException('You already reported this issue today. We will update you when it is reviewed.', HttpStatus.TOO_MANY_REQUESTS);

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.problemReport.findFirst({ where: { problemSlug: slug, category: input.category, status: { in: ['open', 'in_review'] } }, orderBy: { createdAt: 'desc' } });
      const report =
        existing ??
        (await tx.problemReport.create({
          data: { problemSlug: slug, category: input.category, title: `${CATEGORY_LABEL[input.category]} in ${titles.get(slug)?.title ?? slug}` },
        }));
      await tx.problemReportEntry.create({
        data: { reportId: report.id, userId, learnerName: user.name, message: message.slice(0, 2000), submissionId: input.submissionId ?? null, language: input.language ? languageName(input.language) : '' },
      });
      await tx.problemReportEvent.create({ data: { reportId: report.id, kind: 'report', actorName: user.name, text: existing ? 'Added another learner report' : 'Reported the issue' } });
      await tx.problemReport.update({ where: { id: report.id }, data: { updatedAt: new Date() } });
      return { report, grouped: Boolean(existing) };
    });
    return { id: result.report.id, ref: `PR-${result.report.number}`, grouped: result.grouped };
  }

  async list(query: ReportListQuery, actor: AdminActor) {
    const and: Prisma.ProblemReportWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.category) and.push({ category: query.category });
    if (query.assignee === 'me') and.push({ assigneeId: actor.id });
    else if (query.assignee === 'none') and.push({ assigneeId: null });
    else if (query.assignee) and.push({ assigneeId: query.assignee });
    if (query.q) and.push({ OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { problemSlug: { contains: query.q, mode: 'insensitive' } }, { entries: { some: { message: { contains: query.q, mode: 'insensitive' } } } }] });
    const rows = await this.prisma.problemReport.findMany({ where: { AND: and }, include: INCLUDE, orderBy: { updatedAt: 'desc' }, take: 1000 });
    const titles = await problemTitles(this.prisma, rows.map((row) => row.problemSlug));
    let items = rows.map((row) => this.present(row, titles));
    if (query.priority) items = items.filter((item) => item.priority === query.priority);
    const active = (status: string) => status === 'open' || status === 'in_review';
    items.sort((a, b) => Number(active(b.status)) - Number(active(a.status)) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.updatedAt - a.updatedAt);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const counts = await this.prisma.problemReport.groupBy({ by: ['status'], _count: { _all: true } });
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
      counts: Object.fromEntries(REPORT_STATUSES.map((status) => [status, counts.find((row) => row.status === status)?._count._all ?? 0])),
    };
  }

  get(id: string) {
    return this.one(id);
  }

  private async change(id: string, actor: AdminActor, fn: (row: Row, name: string, tx: Prisma.TransactionClient) => Promise<{ action: string; summary: string; changes?: unknown }>) {
    const row = await this.load(id);
    const me = await this.directory.person(actor.id);
    await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.problemReport.findUnique({ where: { id }, select: { updatedAt: true } });
      if (!fresh || fresh.updatedAt.getTime() !== row.updatedAt.getTime()) throw new ConflictException('Someone else just updated this report. Refresh and try again.');
      const entry = await fn(row, me.name, tx);
      await tx.problemReport.update({ where: { id }, data: { updatedAt: new Date() } });
      await this.audit.record(tx, actor, { ...entry, entityType: 'problem_report', entityId: id, summary: `PR-${row.number}: ${entry.summary}` });
    });
    return this.one(id);
  }

  assign(id: string, assigneeId: string | null, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      const person = await this.directory.teammate(assigneeId);
      if ((person?.id ?? null) === row.assigneeId) throw new BadRequestException('Already assigned that way.');
      await tx.problemReport.update({ where: { id }, data: { assigneeId: person?.id ?? null, assigneeName: person?.name ?? null } });
      const text = person ? `Assigned to ${person.id === actor.id ? 'themselves' : person.name}` : 'Removed the assignee';
      await tx.problemReportEvent.create({ data: { reportId: id, kind: 'assign', actorName: name, text } });
      return { action: 'problem_report.assign', summary: text, changes: [{ field: 'Assignee', before: row.assigneeName, after: person?.name ?? null }] };
    });
  }

  startReview(id: string, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      if (row.status !== 'open') throw new BadRequestException('Only open reports can move to review.');
      await tx.problemReport.update({ where: { id }, data: { status: 'in_review', ...(row.assigneeId ? {} : { assigneeId: actor.id, assigneeName: name }) } });
      await tx.problemReportEvent.create({ data: { reportId: id, kind: 'status', actorName: name, text: 'Started the review' } });
      return { action: 'problem_report.review', summary: 'Started the review', changes: [{ field: 'Status', before: 'open', after: 'in_review' }] };
    });
  }

  async close(id: string, status: 'resolved' | 'rejected', type: ResolutionType, note: string, actor: AdminActor) {
    if (RESOLUTIONS[type] !== status) throw new BadRequestException({ message: 'That outcome does not match the decision.', issues: { type: `Pick a ${status === 'resolved' ? 'fix' : 'rejection'} reason` } });
    const clean = note.trim();
    if (clean.length < 5) throw new BadRequestException({ message: 'Add a short note for the learners.', issues: { note: 'At least 5 characters' } });
    const result = await this.change(id, actor, async (row, name, tx) => {
      if (row.status !== 'open' && row.status !== 'in_review') throw new BadRequestException('This report is already closed.');
      await tx.problemReport.update({ where: { id }, data: { status, resolutionType: type, resolutionNote: clean, resolvedAt: new Date() } });
      await tx.problemReportEvent.create({ data: { reportId: id, kind: 'status', actorName: name, text: status === 'resolved' ? `Resolved: ${clean}` : `Rejected: ${clean}` } });
      await this.directory.notify(
        tx,
        row.entries.map((entry) => entry.userId),
        status === 'resolved' ? `Your report on ${row.title} was fixed` : `Update on your report: ${row.title}`,
        clean,
        `/problems/${row.problemSlug}`,
      );
      return { action: `problem_report.${status === 'resolved' ? 'resolve' : 'reject'}`, summary: `${status === 'resolved' ? 'Resolved' : 'Rejected'} (${type})`, changes: [{ field: 'Status', before: row.status, after: status }] };
    });
    return result;
  }

  reopen(id: string, actor: AdminActor) {
    return this.change(id, actor, async (row, name, tx) => {
      if (row.status !== 'resolved' && row.status !== 'rejected') throw new BadRequestException('Only closed reports can be reopened.');
      await tx.problemReport.update({ where: { id }, data: { status: 'open', resolutionType: null, resolutionNote: null, resolvedAt: null } });
      await tx.problemReportEvent.create({ data: { reportId: id, kind: 'status', actorName: name, text: 'Reopened the report' } });
      return { action: 'problem_report.reopen', summary: 'Reopened', changes: [{ field: 'Status', before: row.status, after: 'open' }] };
    });
  }

  reply(id: string, message: string, actor: AdminActor) {
    const clean = message.trim();
    if (clean.length < 2) throw new BadRequestException('Write a reply first.');
    return this.change(id, actor, async (row, name, tx) => {
      await tx.problemReportEvent.create({ data: { reportId: id, kind: 'reply', actorName: name, text: clean.slice(0, 2000) } });
      await this.directory.notify(tx, row.entries.map((entry) => entry.userId), `Reply on your report: ${row.title}`, clean, `/problems/${row.problemSlug}`);
      return { action: 'problem_report.reply', summary: 'Replied to reporters' };
    });
  }

  note(id: string, text: string, actor: AdminActor) {
    const clean = text.trim();
    if (clean.length < 2) throw new BadRequestException('Write a note first.');
    return this.change(id, actor, async (_row, name, tx) => {
      await tx.problemReportEvent.create({ data: { reportId: id, kind: 'note', actorName: name, text: clean.slice(0, 2000) } });
      return { action: 'problem_report.note', summary: 'Added an internal note' };
    });
  }
}