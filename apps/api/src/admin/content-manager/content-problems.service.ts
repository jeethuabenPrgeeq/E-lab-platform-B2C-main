import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import type { CreateProblemDto } from '../problems/problems.dto.js';
import { ProblemsService } from '../problems/problems.service.js';
import type { ContentProblemQueryDto, ContentUpdateProblemDto } from './content-problems.dto.js';

const TO_DB_DIFFICULTY = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;
const EDITABLE = new Set(['draft']);
const PERSON = { select: { id: true, name: true } } as const;

@Injectable()
export class ContentProblemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly problems: ProblemsService,
  ) {}

  private scope(actor: AdminActor, organizationId: string, scope?: string): Prisma.ProblemWhereInput {
    if (scope === 'created') return { organizationId, createdById: actor.id };
    if (scope === 'assigned') return { organizationId, assigneeId: actor.id };
    return { organizationId };
  }

  private async owned(id: string, organizationId: string) {
    const row = await this.prisma.problem.findFirst({ where: { id, organizationId }, select: { id: true, status: true, updatedAt: true, title: true } });
    if (!row) throw new NotFoundException('Problem not found in your institution.');
    return row;
  }

  async list(query: ContentProblemQueryDto, actor: AdminActor, organizationId: string) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const base = this.scope(actor, organizationId, query.scope);
    const where: Prisma.ProblemWhereInput = {
      AND: [
        base,
        query.status ? { status: query.status } : {},
        query.difficulty ? { difficulty: TO_DB_DIFFICULTY[query.difficulty] } : {},
        query.technologyId ? { technologyId: query.technologyId } : {},
        query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { slug: { contains: query.q, mode: 'insensitive' } }] } : {},
      ],
    };
    const [rows, total, byStatus] = await Promise.all([
      this.prisma.problem.findMany({
        where,
        orderBy: { updatedAt: query.order ?? 'desc' },
        skip,
        take,
        include: { technology: { select: { id: true, slug: true, name: true, status: true } }, createdBy: PERSON, assignee: PERSON },
      }),
      this.prisma.problem.count({ where }),
      this.prisma.problem.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
    ]);
    const counts = await this.prisma.testCase.groupBy({ by: ['problemId', 'hidden'], where: { problemId: { in: rows.map((row) => row.id) }, enabled: true }, _count: { _all: true } });
    const testsOf = (id: string, hidden: boolean) => counts.find((row) => row.problemId === id && row.hidden === hidden)?._count._all ?? 0;
    return {
      items: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        technology: row.technology,
        difficulty: row.difficulty.toLowerCase(),
        status: row.status,
        version: row.version,
        sampleTests: testsOf(row.id, false),
        hiddenTests: testsOf(row.id, true),
        reviewNote: row.reviewNote,
        publishedAt: row.publishedAt,
        updatedAt: row.updatedAt,
        createdBy: row.createdBy,
        assignee: row.assignee,
        mine: row.createdById === actor.id,
        editable: EDITABLE.has(row.status),
      })),
      total,
      page,
      pageSize,
      statusCounts: Object.fromEntries(byStatus.map((row) => [row.status, row._count._all])),
    };
  }

  async get(id: string, organizationId: string) {
    const row = await this.owned(id, organizationId);
    const [detail, extra] = await Promise.all([
      this.problems.get(id, organizationId),
      this.prisma.problem.findUnique({ where: { id }, select: { assignee: PERSON, assignedAt: true } }),
    ]);
    return { ...detail, nextActions: [], assignee: extra?.assignee ?? null, assignedAt: extra?.assignedAt ?? null, editable: EDITABLE.has(row.status) };
  }

  async versions(id: string, organizationId: string) {
    await this.owned(id, organizationId);
    return this.problems.versions(id, organizationId);
  }

  async create(dto: CreateProblemDto, actor: AdminActor, organizationId: string) {
    const created = await this.problems.create(dto, actor, organizationId);
    return this.get(created.id, organizationId);
  }

  async update(id: string, dto: ContentUpdateProblemDto, actor: AdminActor, organizationId: string) {
    const row = await this.owned(id, organizationId);
    if (!EDITABLE.has(row.status)) throw new ForbiddenException(`This problem is ${row.status}. Only drafts can be edited for now.`);
    const { expectedUpdatedAt, ...fields } = dto;
    if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== row.updatedAt.getTime()) {
      throw new ConflictException('Someone else saved this problem after you opened it. Reload to see their changes before editing.');
    }
    await this.problems.update(id, fields, actor, organizationId);
    return this.get(id, organizationId);
  }

  async duplicate(id: string, actor: AdminActor, organizationId: string) {
    await this.owned(id, organizationId);
    const source = await this.prisma.problem.findUniqueOrThrow({ where: { id }, include: { testCases: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } } });
    let slug = `${source.slug}-copy`;
    for (let n = 2; await this.prisma.problem.findUnique({ where: { slug }, select: { id: true } }); n += 1) slug = `${source.slug}-copy-${n}`;
    const json = (value: Prisma.JsonValue | null) => (value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue));
    const createdId = await this.prisma.$transaction(async (tx) => {
      const copy = await tx.problem.create({
        data: {
          slug,
          title: `${source.title} (copy)`.slice(0, 160),
          technologyId: source.technologyId,
          difficulty: source.difficulty,
          workspaceType: source.workspaceType,
          source: source.source,
          shortDescription: source.shortDescription,
          problemStatement: source.problemStatement,
          inputFormat: source.inputFormat,
          outputFormat: source.outputFormat,
          constraints: json(source.constraints),
          notes: json(source.notes),
          skills: source.skills as Prisma.InputJsonValue,
          estimatedMinutes: source.estimatedMinutes,
          defaultLanguage: source.defaultLanguage,
          allowedLanguages: source.allowedLanguages as Prisma.InputJsonValue,
          starterCode: source.starterCode,
          starterFiles: json(source.starterFiles),
          sampleTests: json(source.sampleTests),
          domainSlug: source.domainSlug,
          stackSlug: source.stackSlug,
          moduleSlug: source.moduleSlug,
          referenceSolution: source.referenceSolution,
          createdById: actor.id,
          updatedById: actor.id,
          organizationId,
        },
      });
      if (source.testCases.length) {
        await tx.testCase.createMany({
          data: source.testCases.map((test) => ({ problemId: copy.id, input: test.input, expectedOutput: test.expectedOutput, hidden: test.hidden, position: test.position, score: test.score, timeoutMs: test.timeoutMs, enabled: test.enabled })),
        });
      }
      await this.audit.record(tx, actor, { action: 'problem.duplicate', entityType: 'problem', entityId: copy.id, summary: `Duplicated ${source.title} as a new draft` });
      return copy.id;
    });
    return this.get(createdId, organizationId);
  }

  async technologies() {
    const items = await this.prisma.technology.findMany({ where: { status: { not: 'disabled' } }, orderBy: { name: 'asc' }, select: { id: true, slug: true, name: true, status: true, category: true } });
    return { items };
  }
}
