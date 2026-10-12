import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  Prisma,
  ProblemDifficulty,
  ProblemStatus,
  WorkspaceType,
} from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs, slugify } from '../common/pagination.js';
import {
  ProblemVersioningService,
  VERSIONED_STATUSES,
  stableStringify,
} from './problem-versioning.service.js';
import type {
  CreateProblemDto,
  ProblemAction,
  ProblemQueryDto,
  TransitionDto,
  UpdateProblemDto,
} from './problems.dto.js';

const TO_DB_DIFFICULTY: Record<string, ProblemDifficulty> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};
const CATEGORY_WORKSPACE: Record<string, WorkspaceType> = {
  language: 'code',
  framework: 'framework',
  database: 'database',
  devops: 'devops',
  tool: 'code',
};

const RULES: Record<
  ProblemAction,
  {
    from: ProblemStatus[];
    to: ProblemStatus;
    needsNote?: boolean;
    label: string;
  }
> = {
  submit: { from: ['draft'], to: 'review', label: 'Submitted for review' },
  approve: { from: ['review'], to: 'ready', label: 'Approved' },
  sendBack: {
    from: ['review', 'ready'],
    to: 'draft',
    needsNote: true,
    label: 'Sent back to draft',
  },
  publish: { from: ['ready'], to: 'published', label: 'Published' },
  moveBack: { from: ['ready'], to: 'review', label: 'Moved back to review' },
  unpublish: { from: ['published'], to: 'ready', label: 'Unpublished' },
  deprecate: {
    from: ['published'],
    to: 'deprecated',
    needsNote: true,
    label: 'Deprecated',
  },
};

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  technologyId: 'Technology',
  difficulty: 'Difficulty',
  workspaceType: 'Workspace type',
  shortDescription: 'Short description',
  problemStatement: 'Problem statement',
  inputFormat: 'Input format',
  outputFormat: 'Output format',
  constraints: 'Constraints',
  notes: 'Notes',
  skills: 'Skills',
  estimatedMinutes: 'Estimated minutes',
  defaultLanguage: 'Default language',
  allowedLanguages: 'Allowed languages',
  starterCode: 'Starter code',
  referenceSolution: 'Reference solution',
};

const LONG_FIELDS = new Set([
  'problemStatement',
  'starterCode',
  'referenceSolution',
]);

const lines = (value: string | undefined) =>
  value === undefined
    ? undefined
    : value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
const joined = (value: unknown) =>
  Array.isArray(value)
    ? value.join('\n')
    : typeof value === 'string'
      ? value
      : '';

type ProblemWithTech = Prisma.ProblemGetPayload<{
  include: { technology: true };
}>;

interface TestCounts {
  sample: number;
  hidden: number;
}

@Injectable()
export class ProblemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly versioning: ProblemVersioningService,
  ) {}

  private summary(problem: ProblemWithTech, counts: TestCounts) {
    return {
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      technology: {
        id: problem.technology.id,
        slug: problem.technology.slug,
        name: problem.technology.name,
        status: problem.technology.status,
      },
      difficulty: problem.difficulty.toLowerCase(),
      workspaceType: problem.workspaceType,
      status: problem.status,
      version: problem.version,
      sampleTests: counts.sample,
      hiddenTests: counts.hidden,
      reviewNote: problem.reviewNote,
      publishedAt: problem.publishedAt,
      updatedAt: problem.updatedAt,
      createdAt: problem.createdAt,
    };
  }

  private async counts(
    db: Prisma.TransactionClient | PrismaService,
    ids: string[],
  ) {
    const rows = await db.testCase.groupBy({
      by: ['problemId', 'hidden'],
      where: { problemId: { in: ids }, enabled: true },
      _count: { _all: true },
    });
    const map = new Map<string, TestCounts>();
    for (const id of ids) map.set(id, { sample: 0, hidden: 0 });
    for (const row of rows) {
      const entry = map.get(row.problemId)!;
      if (row.hidden) entry.hidden = row._count._all;
      else entry.sample = row._count._all;
    }
    return map;
  }

  blockers(
    problem: {
      title: string;
      problemStatement: string;
      technology: { status: string };
    },
    counts: TestCounts,
    action: ProblemAction,
  ) {
    const issues: string[] = [];
    if (action === 'submit' || action === 'approve' || action === 'publish') {
      if (problem.title.trim().length < 3) issues.push('Add a title.');
      if (problem.problemStatement.trim().length < 20)
        issues.push('Write a problem statement of at least 20 characters.');
      if (counts.sample + counts.hidden === 0)
        issues.push('Add at least one test case.');
    }
    if (action === 'approve' || action === 'publish') {
      if (counts.sample === 0)
        issues.push('Add at least one enabled sample test.');
      if (counts.hidden === 0)
        issues.push('Add at least one enabled hidden test.');
    }
    if (action === 'publish' && problem.technology.status !== 'active')
      issues.push('The technology must be active before publishing.');
    return issues;
  }

  async list(query: ProblemQueryDto) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where: Prisma.ProblemWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.difficulty
        ? { difficulty: TO_DB_DIFFICULTY[query.difficulty] }
        : {}),
      ...(query.technologyId ? { technologyId: query.technologyId } : {}),
      ...(query.technology ? { technology: { slug: query.technology } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.missingTests
        ? {
            OR: [
              { testCases: { none: { hidden: false, enabled: true } } },
              { testCases: { none: { hidden: true, enabled: true } } },
            ],
          }
        : {}),
    };

    const [items, total, byStatus] = await this.prisma.$transaction([
      this.prisma.problem.findMany({
        where,
        orderBy: { [query.sort ?? 'updatedAt']: query.order ?? 'desc' },
        skip,
        take,
        include: { technology: true },
      }),
      this.prisma.problem.count({ where }),
      this.prisma.problem.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);

    const counts = await this.counts(
      this.prisma,
      items.map((item) => item.id),
    );
    const statusCounts = Object.fromEntries(
      byStatus.map((row) => [
        row.status,
        (row._count as { _all: number })._all,
      ]),
    );

    return {
      items: items.map((item) => this.summary(item, counts.get(item.id)!)),
      total,
      page,
      pageSize,
      statusCounts,
    };
  }

  async get(id: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: {
        technology: true,
        testCases: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
        sourceChecks: { orderBy: { createdAt: 'asc' } },
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        publishedBy: { select: { id: true, name: true } },
        _count: { select: { versions: true } },
      },
    });
    if (!problem) throw new NotFoundException('Problem not found.');

    const counts = (await this.counts(this.prisma, [id])).get(id)!;
    const nextActions = (Object.keys(RULES) as ProblemAction[])
      .filter((action) => RULES[action].from.includes(problem.status))
      .map((action) => ({
        action,
        label: RULES[action].label,
        needsNote: Boolean(RULES[action].needsNote),
        blockers: this.blockers(problem, counts, action),
      }));

    return {
      ...this.summary(problem, counts),
      shortDescription: problem.shortDescription,
      problemStatement: problem.problemStatement,
      inputFormat: problem.inputFormat ?? '',
      outputFormat: problem.outputFormat ?? '',
      constraints: joined(problem.constraints),
      notes: joined(problem.notes),
      skills: Array.isArray(problem.skills) ? problem.skills : [],
      estimatedMinutes: problem.estimatedMinutes,
      defaultLanguage: problem.defaultLanguage,
      allowedLanguages: Array.isArray(problem.allowedLanguages)
        ? problem.allowedLanguages
        : [],
      starterCode: problem.starterCode ?? '',
      hasReferenceSolution: Boolean(problem.referenceSolution),
      referenceSolution: problem.referenceSolution ?? '',
      testCases: problem.testCases,
      sourceChecks: problem.sourceChecks,
      createdBy: problem.createdBy,
      updatedBy: problem.updatedBy,
      publishedBy: problem.publishedBy,
      versionCount: problem._count.versions,
      nextActions,
    };
  }

  private async loadTechnology(technologyId: string) {
    const tech = await this.prisma.technology.findUnique({
      where: { id: technologyId },
    });
    if (!tech) throw new BadRequestException('Technology not found.');
    return tech;
  }

  async create(dto: CreateProblemDto, actor: AdminActor) {
    const tech = await this.loadTechnology(dto.technologyId);
    if (tech.status === 'disabled')
      throw new BadRequestException(
        `${tech.name} is disabled. Enable it before adding problems.`,
      );

    const slug = dto.slug ?? slugify(dto.title);
    if (!slug)
      throw new BadRequestException(
        'Could not build a slug from the title. Pass a slug.',
      );
    const clash = await this.prisma.problem.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (clash)
      throw new ConflictException(
        `The slug "${slug}" is already used by another problem.`,
      );

    const language = dto.defaultLanguage ?? tech.judgeLanguage ?? tech.slug;

    return this.prisma
      .$transaction(async (tx) => {
        const problem = await tx.problem.create({
          data: {
            slug,
            title: dto.title.trim(),
            technologyId: tech.id,
            difficulty: TO_DB_DIFFICULTY[dto.difficulty],
            workspaceType:
              dto.workspaceType ?? CATEGORY_WORKSPACE[tech.category] ?? 'code',
            shortDescription: dto.shortDescription?.trim() ?? '',
            problemStatement: dto.problemStatement ?? '',
            inputFormat: dto.inputFormat ?? null,
            outputFormat: dto.outputFormat ?? null,
            constraints: lines(dto.constraints) ?? [],
            notes: lines(dto.notes) ?? [],
            skills: dto.skills ?? [],
            estimatedMinutes: dto.estimatedMinutes ?? 15,
            defaultLanguage: language,
            allowedLanguages: dto.allowedLanguages ?? [language],
            starterCode: dto.starterCode ?? null,
            referenceSolution: dto.referenceSolution ?? null,
            createdById: actor.id,
            updatedById: actor.id,
          },
        });
        await this.audit.record(tx, actor, {
          action: 'problem.create',
          entityType: 'problem',
          entityId: problem.id,
          summary: `Created problem ${problem.title}`,
        });
        return { id: problem.id, slug: problem.slug };
      })
      .then(({ id }) => this.get(id));
  }

  async update(id: string, dto: UpdateProblemDto, actor: AdminActor) {
    const existing = await this.prisma.problem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Problem not found.');

    if (dto.technologyId && dto.technologyId !== existing.technologyId) {
      const tech = await this.loadTechnology(dto.technologyId);
      if (tech.status === 'disabled')
        throw new BadRequestException(`${tech.name} is disabled.`);
    }

    const { reason, ...fields } = dto;
    const data: Prisma.ProblemUncheckedUpdateInput = {
      ...(fields.title !== undefined ? { title: fields.title.trim() } : {}),
      ...(fields.technologyId !== undefined
        ? { technologyId: fields.technologyId }
        : {}),
      ...(fields.difficulty !== undefined
        ? { difficulty: TO_DB_DIFFICULTY[fields.difficulty] }
        : {}),
      ...(fields.workspaceType !== undefined
        ? { workspaceType: fields.workspaceType }
        : {}),
      ...(fields.shortDescription !== undefined
        ? { shortDescription: fields.shortDescription.trim() }
        : {}),
      ...(fields.problemStatement !== undefined
        ? { problemStatement: fields.problemStatement }
        : {}),
      ...(fields.inputFormat !== undefined
        ? { inputFormat: fields.inputFormat }
        : {}),
      ...(fields.outputFormat !== undefined
        ? { outputFormat: fields.outputFormat }
        : {}),
      ...(fields.constraints !== undefined
        ? { constraints: lines(fields.constraints) }
        : {}),
      ...(fields.notes !== undefined ? { notes: lines(fields.notes) } : {}),
      ...(fields.skills !== undefined ? { skills: fields.skills } : {}),
      ...(fields.estimatedMinutes !== undefined
        ? { estimatedMinutes: fields.estimatedMinutes }
        : {}),
      ...(fields.defaultLanguage !== undefined
        ? { defaultLanguage: fields.defaultLanguage }
        : {}),
      ...(fields.allowedLanguages !== undefined
        ? { allowedLanguages: fields.allowedLanguages }
        : {}),
      ...(fields.starterCode !== undefined
        ? { starterCode: fields.starterCode }
        : {}),
      ...(fields.referenceSolution !== undefined
        ? { referenceSolution: fields.referenceSolution }
        : {}),
    };

    const before = existing as unknown as Record<string, unknown>;
    const after = data as Record<string, unknown>;
    const changes = Object.keys(after)
      .filter(
        (key) =>
          JSON.stringify(before[key] ?? null) !==
          JSON.stringify(after[key] ?? null),
      )
      .map((key) => ({
        field: FIELD_LABELS[key] ?? key,
        before: LONG_FIELDS.has(key) ? '(changed)' : (before[key] ?? null),
        after: LONG_FIELDS.has(key) ? '(changed)' : (after[key] ?? null),
      }));
    if (changes.length === 0) return this.get(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.problem.update({
        where: { id },
        data: { ...data, updatedById: actor.id },
      });
      const version = VERSIONED_STATUSES.has(existing.status)
        ? await this.versioning.bump(tx, id, reason, actor)
        : null;
      await this.audit.record(tx, actor, {
        action: 'problem.update',
        entityType: 'problem',
        entityId: id,
        summary: version
          ? `Updated ${existing.title} (now v${version})`
          : `Updated ${existing.title}`,
        changes: { fields: changes, ...(reason ? { reason } : {}) },
      });
    });

    return this.get(id);
  }

  async transition(id: string, dto: TransitionDto, actor: AdminActor) {
    const rule = RULES[dto.action];
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: { technology: true },
    });
    if (!problem) throw new NotFoundException('Problem not found.');
    if (!rule.from.includes(problem.status)) {
      throw new ConflictException(
        `Cannot ${dto.action} a problem that is ${problem.status}.`,
      );
    }
    if (rule.needsNote && (!dto.note || dto.note.trim().length < 5)) {
      throw new BadRequestException(
        'Add a note of at least 5 characters explaining why.',
      );
    }
    const counts = (await this.counts(this.prisma, [id])).get(id)!;
    const issues = this.blockers(problem, counts, dto.action);
    if (issues.length)
      throw new BadRequestException({
        message: 'This problem is not ready for that step.',
        issues,
      });

    await this.prisma.$transaction(async (tx) => {
      const moved = await tx.problem.updateMany({
        where: { id, status: problem.status },
        data: {
          status: rule.to,
          updatedById: actor.id,
          ...(dto.action === 'sendBack'
            ? { reviewNote: dto.note!.trim() }
            : {}),
          ...(dto.action === 'approve' || dto.action === 'publish'
            ? { reviewNote: null }
            : {}),
          ...(dto.action === 'publish'
            ? { publishedById: actor.id, publishedAt: new Date() }
            : {}),
        },
      });
      if (moved.count === 0)
        throw new ConflictException(
          'Someone else changed this problem. Reload and try again.',
        );

      let version: number | null = null;
      if (dto.action === 'publish') {
        const latest = await this.versioning.latest(tx, id);
        if (!latest) {
          await this.versioning.record(
            tx,
            id,
            problem.version,
            dto.note?.trim() || 'Initial release',
            actor,
          );
          version = problem.version;
        } else {
          const current = await this.versioning.snapshot(tx, id);
          if (stableStringify(current) !== stableStringify(latest.snapshot)) {
            version = await this.versioning.bump(
              tx,
              id,
              dto.note?.trim() || 'Republished with changes',
              actor,
            );
          }
        }
      }

      await this.audit.record(tx, actor, {
        action: `problem.${dto.action}`,
        entityType: 'problem',
        entityId: id,
        summary: `${rule.label}: ${problem.title}${version ? ` (v${version})` : ''}`,
        changes: {
          fields: [{ field: 'Status', before: problem.status, after: rule.to }],
          ...(dto.note ? { note: dto.note.trim() } : {}),
        },
      });
    });

    return this.get(id);
  }

  async versions(id: string) {
    const exists = await this.prisma.problem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Problem not found.');
    const items = await this.prisma.problemVersion.findMany({
      where: { problemId: id },
      orderBy: { version: 'desc' },
      include: { changedBy: { select: { id: true, name: true } } },
    });
    return { items };
  }

  async remove(id: string, actor: AdminActor) {
    const problem = await this.prisma.problem.findUnique({ where: { id } });
    if (!problem) throw new NotFoundException('Problem not found.');
    if (problem.status !== 'draft' || problem.publishedAt) {
      throw new ConflictException(
        'Only drafts that were never published can be deleted. Deprecate published problems instead.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.problem.delete({ where: { id } });
      await this.audit.record(tx, actor, {
        action: 'problem.delete',
        entityType: 'problem',
        entityId: id,
        summary: `Deleted draft ${problem.title}`,
      });
    });
    return { deleted: true };
  }
}
