import { Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const DB_JUDGED_LANGUAGES = [
  'c',
  'cpp',
  'java',
  'csharp',
  'python',
  'go',
  'ruby',
  'swift',
] as const;

const DIFFICULTY_LABEL = {
  Easy: 'Easy',
  Medium: 'Medium',
  Hard: 'Hard',
} as const;

const SUMMARY_SELECT = {
  id: true,
  slug: true,
  title: true,
  difficulty: true,
  workspaceType: true,
  shortDescription: true,
  skills: true,
  estimatedMinutes: true,
  defaultLanguage: true,
  organizationId: true,
  technology: { select: { slug: true, name: true } },
} satisfies Prisma.ProblemSelect;

type SummaryRow = Prisma.ProblemGetPayload<{ select: typeof SUMMARY_SELECT }>;

export interface LearnerScope {
  organizationId: string | null;
  groupId?: string | null;
  institution: { id: string; name: string } | null;
}

const strings = (value: Prisma.JsonValue | null) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

@Injectable()
export class LearnerCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async scope(userId: string | null): Promise<LearnerScope> {
    if (!userId) return { organizationId: null, institution: null };
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        learnerGroupId: true,
        organization: { select: { id: true, name: true, status: true } },
      },
    });
    const org = user?.organization;
    if (!org || org.status !== 'active')
      return { organizationId: null, institution: null };
    return {
      organizationId: org.id,
      groupId: user?.learnerGroupId ?? null,
      institution: { id: org.id, name: org.name },
    };
  }

  visibleWhere(scope: LearnerScope): Prisma.ProblemWhereInput {
    return {
      status: 'published',
      visibility: 'listed',
      defaultLanguage: { in: [...DB_JUDGED_LANGUAGES] },
      OR: [
        { organizationId: null },
        ...(scope.organizationId
          ? [{ organizationId: scope.organizationId }]
          : []),
      ],
    };
  }

  private summary(row: SummaryRow, scope: LearnerScope) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      technologySlug: row.technology.slug,
      technologyName: row.technology.name,
      difficulty: DIFFICULTY_LABEL[row.difficulty],
      workspaceType: row.workspaceType,
      shortDescription: row.shortDescription,
      skills: strings(row.skills),
      estimatedMinutes: row.estimatedMinutes,
      defaultLanguage: row.defaultLanguage,
      source: row.organizationId
        ? ('institution' as const)
        : ('platform' as const),
      institutionName: row.organizationId
        ? (scope.institution?.name ?? null)
        : null,
    };
  }

  async list(userId: string, technology?: string) {
    const scope = await this.scope(userId);
    const rows = await this.prisma.problem.findMany({
      where: {
        ...this.visibleWhere(scope),
        ...(technology ? { technology: { slug: technology } } : {}),
      },
      orderBy: [
        { organizationId: { sort: 'desc', nulls: 'last' } },
        { difficulty: 'asc' },
        { title: 'asc' },
      ],
      take: 500,
      select: SUMMARY_SELECT,
    });
    return {
      institution: scope.institution,
      items: rows.map((row) => this.summary(row, scope)),
    };
  }

  async get(userId: string, slug: string) {
    const scope = await this.scope(userId);
    const row = await this.prisma.problem.findFirst({
      where: { ...this.visibleWhere(scope), slug },
      select: {
        ...SUMMARY_SELECT,
        problemStatement: true,
        inputFormat: true,
        outputFormat: true,
        constraints: true,
        notes: true,
        allowedLanguages: true,
        starterCode: true,
        testCases: {
          where: { hidden: false, enabled: true },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, input: true, expectedOutput: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Problem not found.');
    return {
      ...this.summary(row, scope),
      problemStatement: row.problemStatement,
      inputFormat: row.inputFormat ?? undefined,
      outputFormat: row.outputFormat ?? undefined,
      constraints: strings(row.constraints),
      notes: strings(row.notes),
      allowedLanguages: strings(row.allowedLanguages).length
        ? strings(row.allowedLanguages)
        : [row.defaultLanguage],
      starterCode: row.starterCode ?? undefined,
      sampleTests: row.testCases.map((test, index) => ({
        id: test.id,
        title: `Sample ${index + 1}`,
        input: test.input ?? undefined,
        expectedOutput: test.expectedOutput,
      })),
    };
  }

  async solvedSlugs(userId: string) {
    const rows = await this.prisma.codeRun.findMany({
      where: { userId, kind: 'submit', verdict: 'ac' },
      distinct: ['problemSlug'],
      select: { problemSlug: true },
    });
    return rows.map((row) => row.problemSlug);
  }

  async batches(userId: string) {
    const scope = await this.scope(userId);
    if (!scope.organizationId) return { institution: null, items: [] };
    const visible = this.visibleWhere(scope);
    const [batches, solved] = await Promise.all([
      this.prisma.contentBatch.findMany({
        where: {
          organizationId: scope.organizationId,
          assignedAt: { not: null },
          OR: [
            { assignedGroupId: null },
            ...(scope.groupId ? [{ assignedGroupId: scope.groupId }] : []),
          ],
        },
        orderBy: { assignedAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          focus: true,
          assignedAt: true,
          items: {
            where: { problem: visible },
            orderBy: { position: 'asc' },
            select: {
              problem: {
                select: {
                  slug: true,
                  title: true,
                  difficulty: true,
                  shortDescription: true,
                  skills: true,
                  estimatedMinutes: true,
                  technology: { select: { slug: true, name: true } },
                },
              },
            },
          },
        },
      }),
      this.solvedSlugs(userId),
    ]);
    const done = new Set(solved);
    return {
      institution: scope.institution,
      items: batches.map((batch) => {
        const problems = batch.items.map(({ problem }) => ({
          slug: problem.slug,
          title: problem.title,
          difficulty: DIFFICULTY_LABEL[problem.difficulty],
          shortDescription: problem.shortDescription,
          skills: strings(problem.skills),
          estimatedMinutes: problem.estimatedMinutes,
          technologySlug: problem.technology.slug,
          technologyName: problem.technology.name,
          solved: done.has(problem.slug),
        }));
        return {
          id: batch.id,
          name: batch.name,
          description: batch.description,
          type: batch.type,
          focus: batch.focus,
          assignedAt: batch.assignedAt,
          problems,
          total: problems.length,
          solvedCount: problems.filter((problem) => problem.solved).length,
        };
      }),
    };
  }

  async hiddenTests(userId: string | null, slug: string, language: string) {
    const scope = await this.scope(userId);
    const row = await this.prisma.problem.findFirst({
      where: { ...this.visibleWhere(scope), slug },
      select: {
        defaultLanguage: true,
        allowedLanguages: true,
        testCases: {
          where: { hidden: true, enabled: true },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: { input: true, expectedOutput: true },
        },
      },
    });
    if (!row) return [];
    const allowed = new Set([
      row.defaultLanguage,
      ...strings(row.allowedLanguages),
    ]);
    if (!allowed.has(language)) return [];
    return row.testCases.map((test) => ({
      input: test.input ?? undefined,
      expectedOutput: test.expectedOutput,
    }));
  }
}
