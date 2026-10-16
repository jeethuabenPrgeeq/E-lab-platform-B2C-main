import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { ProblemVersioningService } from '../problems/problem-versioning.service.js';
import type {
  CreateSourceCheckDto,
  CreateTestCaseDto,
  ReorderTestCasesDto,
  UpdateSourceCheckDto,
  UpdateTestCaseDto,
} from './test-cases.dto.js';

type Tx = Prisma.TransactionClient;

const TEST_LABELS: Record<string, string> = {
  input: 'Input',
  expectedOutput: 'Expected output',
  hidden: 'Visibility',
  score: 'Score',
  timeoutMs: 'Timeout',
  enabled: 'Enabled',
};

function testChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  return Object.keys(TEST_LABELS)
    .filter(
      (key) =>
        after[key] !== undefined &&
        JSON.stringify(before[key] ?? null) !==
          JSON.stringify(after[key] ?? null),
    )
    .map((key) =>
      key === 'input' || key === 'expectedOutput'
        ? { field: TEST_LABELS[key], before: '(changed)', after: '(changed)' }
        : key === 'hidden'
          ? {
              field: TEST_LABELS[key],
              before: before[key] ? 'Hidden' : 'Sample',
              after: after[key] ? 'Hidden' : 'Sample',
            }
          : {
              field: TEST_LABELS[key],
              before: before[key] ?? null,
              after: after[key],
            },
    );
}

function validateRegex(pattern: string, isRegex: boolean | undefined) {
  if (!isRegex) return;
  try {
    new RegExp(pattern);
  } catch {
    throw new BadRequestException('pattern is not a valid regular expression.');
  }
}

@Injectable()
export class TestCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly versioning: ProblemVersioningService,
  ) {}

  async isHidden(id: string) {
    const test = await this.prisma.testCase.findFirst({ where: { id, problem: { organizationId: null } }, select: { hidden: true } });
    if (!test) throw new NotFoundException('Test case not found.');
    return test.hidden;
  }

  private async problemOrThrow(problemId: string) {
    const problem = await this.prisma.problem.findFirst({
      where: { id: problemId, organizationId: null },
      include: { technology: { select: { id: true, name: true, slug: true } } },
    });
    if (!problem) throw new NotFoundException('Problem not found.');
    return problem;
  }

  private async finish(
    tx: Tx,
    actor: AdminActor,
    problemId: string,
    reason: string | undefined,
    entry: {
      action: string;
      entityType: string;
      entityId: string;
      summary: string;
      changes?: unknown;
    },
  ) {
    const version = await this.versioning.requireReasonIfVersioned(
      tx,
      problemId,
      reason,
      actor,
    );
    await tx.problem.update({
      where: { id: problemId },
      data: { updatedById: actor.id },
    });
    await this.audit.record(tx, actor, {
      ...entry,
      summary: version
        ? `${entry.summary} (problem now v${version})`
        : entry.summary,
      changes: {
        ...(entry.changes ? { fields: entry.changes } : {}),
        problemId,
        ...(reason ? { reason } : {}),
      },
    });
  }

  async overview() {
    const problems = await this.prisma.problem.findMany({
      where: { status: { not: 'deprecated' }, organizationId: null },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        difficulty: true,
        technology: { select: { name: true, slug: true } },
      },
    });
    const rows = await this.prisma.testCase.groupBy({
      by: ['problemId', 'hidden'],
      where: { enabled: true },
      _count: { _all: true },
    });
    const counts = new Map<string, { sample: number; hidden: number }>();
    for (const row of rows) {
      const entry = counts.get(row.problemId) ?? { sample: 0, hidden: 0 };
      if (row.hidden) entry.hidden = row._count._all;
      else entry.sample = row._count._all;
      counts.set(row.problemId, entry);
    }
    const items = problems.map((problem) => {
      const entry = counts.get(problem.id) ?? { sample: 0, hidden: 0 };
      return {
        ...problem,
        difficulty: problem.difficulty.toLowerCase(),
        technology: problem.technology.name,
        sampleTests: entry.sample,
        hiddenTests: entry.hidden,
      };
    });
    return {
      totals: {
        problems: items.length,
        testCases: items.reduce(
          (sum, item) => sum + item.sampleTests + item.hiddenTests,
          0,
        ),
        withoutSample: items.filter((item) => item.sampleTests === 0).length,
        withoutHidden: items.filter((item) => item.hiddenTests === 0).length,
      },
      items,
    };
  }

  async list(problemId: string) {
    const problem = await this.problemOrThrow(problemId);
    const [testCases, sourceChecks] = await Promise.all([
      this.prisma.testCase.findMany({
        where: { problemId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.sourceCheck.findMany({
        where: { problemId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      problem: {
        id: problem.id,
        slug: problem.slug,
        title: problem.title,
        status: problem.status,
        version: problem.version,
        difficulty: problem.difficulty.toLowerCase(),
        technology: problem.technology,
        hasReferenceSolution: Boolean(problem.referenceSolution),
      },
      testCases,
      sourceChecks,
    };
  }

  async create(problemId: string, dto: CreateTestCaseDto, actor: AdminActor) {
    await this.problemOrThrow(problemId);
    const { reason, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      const last = await tx.testCase.aggregate({
        where: { problemId },
        _max: { position: true },
      });
      const test = await tx.testCase.create({
        data: {
          problemId,
          input: fields.input ?? null,
          expectedOutput: fields.expectedOutput,
          hidden: fields.hidden,
          score: fields.score ?? 1,
          timeoutMs: fields.timeoutMs ?? null,
          enabled: fields.enabled ?? true,
          position: (last._max.position ?? -1) + 1,
        },
      });
      await this.finish(tx, actor, problemId, reason, {
        action: 'test_case.create',
        entityType: 'test_case',
        entityId: test.id,
        summary: `Added a ${test.hidden ? 'hidden' : 'sample'} test`,
      });
      return test;
    });
  }

  async update(id: string, dto: UpdateTestCaseDto, actor: AdminActor) {
    const existing = await this.prisma.testCase.findFirst({ where: { id, problem: { organizationId: null } } });
    if (!existing) throw new NotFoundException('Test case not found.');
    const { reason, ...fields } = dto;
    const changes = testChanges(
      existing as unknown as Record<string, unknown>,
      fields as Record<string, unknown>,
    );
    if (changes.length === 0) return existing;
    return this.prisma.$transaction(async (tx) => {
      const test = await tx.testCase.update({ where: { id }, data: fields });
      await this.finish(tx, actor, existing.problemId, reason, {
        action: 'test_case.update',
        entityType: 'test_case',
        entityId: id,
        summary: `Edited test #${existing.position + 1}`,
        changes,
      });
      return test;
    });
  }

  async remove(id: string, reason: string | undefined, actor: AdminActor) {
    const existing = await this.prisma.testCase.findFirst({ where: { id, problem: { organizationId: null } } });
    if (!existing) throw new NotFoundException('Test case not found.');
    await this.prisma.$transaction(async (tx) => {
      await tx.testCase.delete({ where: { id } });
      await this.finish(tx, actor, existing.problemId, reason, {
        action: 'test_case.delete',
        entityType: 'test_case',
        entityId: id,
        summary: `Deleted ${existing.hidden ? 'hidden' : 'sample'} test #${existing.position + 1}`,
      });
    });
    return { deleted: true };
  }

  async duplicate(id: string, reason: string | undefined, actor: AdminActor) {
    const existing = await this.prisma.testCase.findFirst({ where: { id, problem: { organizationId: null } } });
    if (!existing) throw new NotFoundException('Test case not found.');
    return this.prisma.$transaction(async (tx) => {
      await tx.testCase.updateMany({
        where: {
          problemId: existing.problemId,
          position: { gt: existing.position },
        },
        data: { position: { increment: 1 } },
      });
      const copy = await tx.testCase.create({
        data: {
          problemId: existing.problemId,
          input: existing.input,
          expectedOutput: existing.expectedOutput,
          hidden: existing.hidden,
          score: existing.score,
          timeoutMs: existing.timeoutMs,
          enabled: existing.enabled,
          position: existing.position + 1,
        },
      });
      await this.finish(tx, actor, existing.problemId, reason, {
        action: 'test_case.duplicate',
        entityType: 'test_case',
        entityId: copy.id,
        summary: `Duplicated test #${existing.position + 1}`,
      });
      return copy;
    });
  }

  async reorder(
    problemId: string,
    dto: ReorderTestCasesDto,
    actor: AdminActor,
  ) {
    await this.problemOrThrow(problemId);
    const existing = await this.prisma.testCase.findMany({
      where: { problemId },
      select: { id: true },
    });
    const known = new Set(existing.map((test) => test.id));
    if (
      dto.ids.length !== known.size ||
      new Set(dto.ids).size !== dto.ids.length ||
      dto.ids.some((id) => !known.has(id))
    ) {
      throw new BadRequestException(
        'ids must list every test case of this problem exactly once.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < dto.ids.length; index += 1) {
        await tx.testCase.update({
          where: { id: dto.ids[index] },
          data: { position: index },
        });
      }
      await this.finish(tx, actor, problemId, dto.reason, {
        action: 'test_case.reorder',
        entityType: 'problem',
        entityId: problemId,
        summary: 'Reordered test cases',
      });
    });
    return this.list(problemId);
  }

  async createCheck(
    problemId: string,
    dto: CreateSourceCheckDto,
    actor: AdminActor,
  ) {
    await this.problemOrThrow(problemId);
    validateRegex(dto.pattern, dto.isRegex);
    const { reason, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      const check = await tx.sourceCheck.create({
        data: {
          problemId,
          ...fields,
          isRegex: fields.isRegex ?? false,
          enabled: fields.enabled ?? true,
        },
      });
      await this.finish(tx, actor, problemId, reason, {
        action: 'source_check.create',
        entityType: 'source_check',
        entityId: check.id,
        summary: `Added a ${check.kind} source check on ${check.filePath}`,
      });
      return check;
    });
  }

  async updateCheck(id: string, dto: UpdateSourceCheckDto, actor: AdminActor) {
    const existing = await this.prisma.sourceCheck.findFirst({
      where: { id, problem: { organizationId: null } },
    });
    if (!existing) throw new NotFoundException('Source check not found.');
    validateRegex(
      dto.pattern ?? existing.pattern,
      dto.isRegex ?? existing.isRegex,
    );
    const { reason, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      const check = await tx.sourceCheck.update({
        where: { id },
        data: fields,
      });
      await this.finish(tx, actor, existing.problemId, reason, {
        action: 'source_check.update',
        entityType: 'source_check',
        entityId: id,
        summary: `Edited a source check on ${check.filePath}`,
      });
      return check;
    });
  }

  async removeCheck(id: string, reason: string | undefined, actor: AdminActor) {
    const existing = await this.prisma.sourceCheck.findFirst({
      where: { id, problem: { organizationId: null } },
    });
    if (!existing) throw new NotFoundException('Source check not found.');
    await this.prisma.$transaction(async (tx) => {
      await tx.sourceCheck.delete({ where: { id } });
      await this.finish(tx, actor, existing.problemId, reason, {
        action: 'source_check.delete',
        entityType: 'source_check',
        entityId: id,
        summary: `Deleted a source check on ${existing.filePath}`,
      });
    });
    return { deleted: true };
  }
}
