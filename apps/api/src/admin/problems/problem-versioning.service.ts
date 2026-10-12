import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';

type Tx = Prisma.TransactionClient;

export const VERSIONED_STATUSES = new Set(['published', 'deprecated']);

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

@Injectable()
export class ProblemVersioningService {
  async snapshot(tx: Tx, problemId: string) {
    const problem = await tx.problem.findUnique({
      where: { id: problemId },
      include: {
        testCases: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
        sourceChecks: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!problem) throw new NotFoundException('Problem not found.');
    return {
      title: problem.title,
      slug: problem.slug,
      technologyId: problem.technologyId,
      difficulty: problem.difficulty,
      workspaceType: problem.workspaceType,
      shortDescription: problem.shortDescription,
      problemStatement: problem.problemStatement,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      constraints: problem.constraints,
      notes: problem.notes,
      skills: problem.skills,
      estimatedMinutes: problem.estimatedMinutes,
      defaultLanguage: problem.defaultLanguage,
      allowedLanguages: problem.allowedLanguages,
      starterCode: problem.starterCode,
      referenceSolution: problem.referenceSolution,
      testCases: problem.testCases.map((test) => ({
        input: test.input,
        expectedOutput: test.expectedOutput,
        hidden: test.hidden,
        position: test.position,
        score: test.score,
        timeoutMs: test.timeoutMs,
        enabled: test.enabled,
      })),
      sourceChecks: problem.sourceChecks.map((check) => ({
        kind: check.kind,
        filePath: check.filePath,
        pattern: check.pattern,
        isRegex: check.isRegex,
        message: check.message,
        enabled: check.enabled,
      })),
    };
  }

  async latest(tx: Tx, problemId: string) {
    return tx.problemVersion.findFirst({
      where: { problemId },
      orderBy: { version: 'desc' },
    });
  }

  async record(
    tx: Tx,
    problemId: string,
    version: number,
    reason: string,
    actor: AdminActor,
  ) {
    const snapshot = await this.snapshot(tx, problemId);
    return tx.problemVersion.create({
      data: {
        problemId,
        version,
        reason,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        changedById: actor.id,
      },
    });
  }

  async bump(
    tx: Tx,
    problemId: string,
    reason: string | undefined,
    actor: AdminActor,
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException(
        'This problem is published. Give a reason of at least 5 characters for the change.',
      );
    }
    const problem = await tx.problem.update({
      where: { id: problemId },
      data: { version: { increment: 1 }, updatedById: actor.id },
      select: { version: true },
    });
    await this.record(tx, problemId, problem.version, reason.trim(), actor);
    return problem.version;
  }

  async requireReasonIfVersioned(
    tx: Tx,
    problemId: string,
    reason: string | undefined,
    actor: AdminActor,
  ) {
    const problem = await tx.problem.findUnique({
      where: { id: problemId },
      select: { status: true },
    });
    if (!problem) throw new NotFoundException('Problem not found.');
    if (VERSIONED_STATUSES.has(problem.status))
      return this.bump(tx, problemId, reason, actor);
    return null;
  }
}
