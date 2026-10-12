import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SubmissionsService } from '../../submissions/submissions.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AdminActor } from '../common/admin-actor.decorator.js';
import { pageArgs } from '../common/pagination.js';
import { RUN_INCLUDE, VERDICTS, fingerprint, languageName, problemTitles, similarity, type RunRow } from './runs.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
export const SUB_RANGES = { '24h': { ms: DAY, bucket: HOUR }, '7d': { ms: 7 * DAY, bucket: 6 * HOUR }, '30d': { ms: 30 * DAY, bucket: DAY } } as const;
export type SubRange = keyof typeof SUB_RANGES;
const REJUDGE_LIMIT = 500;
const PLAGIARISM_PER_PROBLEM = 300;
const PAIR_LIMIT = 200;

export interface SubQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  verdict?: string;
  problem?: string;
  language?: string;
  range?: SubRange;
}

const BASE: Prisma.CodeRunWhereInput = { kind: 'submit', rejudgeOfId: null, state: 'done' };

@Injectable()
export class SubmissionsAdminService implements OnModuleInit {
  private readonly cancelled = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly submissions: SubmissionsService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    await this.prisma.rejudgeJob.updateMany({ where: { status: 'running' }, data: { status: 'cancelled', finishedAt: new Date() } });
  }

  private async present(rows: RunRow[], full = false) {
    const titles = await problemTitles(this.prisma, rows.map((row) => row.problemSlug));
    const attempts = await Promise.all(
      rows.map((row) => (row.userId ? this.prisma.codeRun.count({ where: { ...BASE, userId: row.userId, problemSlug: row.problemSlug, queuedAt: { lte: row.queuedAt } } }) : Promise.resolve(1))),
    );
    return rows.map((row, index) => ({
      id: row.id,
      t: row.queuedAt.getTime(),
      problem: { slug: row.problemSlug, title: titles.get(row.problemSlug)?.title ?? row.problemSlug, difficulty: titles.get(row.problemSlug)?.difficulty ?? null },
      language: languageName(row.language),
      languageSlug: row.language,
      learner: row.user?.name ?? 'Deleted user',
      learnerEmail: row.user?.email ?? null,
      verdict: row.verdict,
      originalVerdict: row.originalVerdict,
      overrideReason: row.overrideReason,
      testsPassed: row.testsPassed ?? 0,
      testsTotal: row.testsTotal ?? 0,
      runtimeMs: row.durationMs ?? 0,
      memoryMb: null,
      attempt: attempts[index],
      worker: row.worker?.name ?? null,
      ...(full ? { code: row.code, results: row.results, stdout: row.stdout, stderr: row.stderr } : {}),
    }));
  }

  private where(query: SubQuery): Prisma.CodeRunWhereInput {
    const and: Prisma.CodeRunWhereInput[] = [BASE, { queuedAt: { gte: new Date(Date.now() - SUB_RANGES[query.range ?? '7d'].ms) } }];
    if (query.verdict) and.push({ verdict: query.verdict });
    if (query.problem) and.push({ problemSlug: query.problem });
    if (query.language) and.push({ language: query.language });
    if (query.q) and.push({ OR: [{ id: { contains: query.q } }, { problemSlug: { contains: query.q, mode: 'insensitive' } }, { user: { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }] } }] });
    return { AND: and };
  }

  async list(query: SubQuery) {
    const { page, pageSize, skip, take } = pageArgs(query);
    const where = this.where(query);
    const [rows, total, judging] = await Promise.all([
      this.prisma.codeRun.findMany({ where, orderBy: { queuedAt: 'desc' }, skip, take, include: RUN_INCLUDE }),
      this.prisma.codeRun.count({ where }),
      this.prisma.codeRun.count({ where: { kind: 'submit', rejudgeOfId: null, state: { in: ['queued', 'running'] } } }),
    ]);
    return { items: await this.present(rows), total, page, pageSize, judging };
  }

  async get(id: string) {
    const row = await this.prisma.codeRun.findUnique({ where: { id }, include: RUN_INCLUDE });
    if (!row || row.kind !== 'submit' || row.rejudgeOfId) throw new NotFoundException('Submission not found.');
    const [item] = await this.present([row], true);
    const [history, rejudges] = await Promise.all([
      row.userId ? this.prisma.codeRun.findMany({ where: { ...BASE, userId: row.userId, problemSlug: row.problemSlug }, orderBy: { queuedAt: 'desc' }, take: 10, select: { id: true, queuedAt: true, verdict: true, testsPassed: true, testsTotal: true } }) : [],
      this.prisma.codeRun.findMany({ where: { rejudgeOfId: id }, orderBy: { queuedAt: 'desc' }, take: 10, select: { id: true, queuedAt: true, verdict: true, rejudgeJobId: true, state: true, error: true } }),
    ]);
    return {
      ...item,
      history: history.map((entry) => ({ id: entry.id, t: entry.queuedAt.getTime(), verdict: entry.verdict, testsPassed: entry.testsPassed, testsTotal: entry.testsTotal })),
      rejudges: rejudges.map((entry) => ({ id: entry.id, t: entry.queuedAt.getTime(), verdict: entry.verdict, jobId: entry.rejudgeJobId, state: entry.state, error: entry.error })),
    };
  }

  async overview(range: SubRange) {
    const { ms, bucket } = SUB_RANGES[range];
    const now = Date.now();
    const from = new Date(now - ms);
    const prevFrom = new Date(now - 2 * ms);
    const rows = await this.prisma.codeRun.findMany({ where: { ...BASE, queuedAt: { gte: prevFrom } }, select: { queuedAt: true, verdict: true, problemSlug: true, language: true, userId: true, durationMs: true } });
    const current = rows.filter((row) => row.queuedAt >= from);
    const previous = rows.filter((row) => row.queuedAt < from);
    const verdicts = Object.fromEntries(VERDICTS.map((verdict) => [verdict, 0])) as Record<string, number>;
    for (const row of current) if (row.verdict) verdicts[row.verdict] = (verdicts[row.verdict] ?? 0) + 1;
    const accepted = current.filter((row) => row.verdict === 'ac');
    const start = Math.floor(from.getTime() / bucket) * bucket;
    const series: { t: number; count: number; ac: number }[] = [];
    for (let t = start; t <= now; t += bucket) series.push({ t, count: 0, ac: 0 });
    for (const row of current) {
      const index = Math.floor((row.queuedAt.getTime() - start) / bucket);
      if (series[index]) {
        series[index].count += 1;
        if (row.verdict === 'ac') series[index].ac += 1;
      }
    }
    const byProblem = new Map<string, { now: typeof current; before: typeof current }>();
    for (const row of current) {
      const entry = byProblem.get(row.problemSlug) ?? { now: [], before: [] };
      entry.now.push(row);
      byProblem.set(row.problemSlug, entry);
    }
    for (const row of previous) byProblem.get(row.problemSlug)?.before.push(row);
    const titles = await problemTitles(this.prisma, [...byProblem.keys()]);
    const rate = (list: typeof current) => (list.length ? (list.filter((row) => row.verdict === 'ac').length / list.length) * 100 : null);
    const problems = [...byProblem.entries()]
      .map(([slug, entry]) => {
        const acRate = rate(entry.now) ?? 0;
        const before = rate(entry.before);
        const acRuns = entry.now.filter((row) => row.verdict === 'ac');
        return {
          slug,
          title: titles.get(slug)?.title ?? slug,
          difficulty: titles.get(slug)?.difficulty ?? null,
          submissions: entry.now.length,
          learners: new Set(entry.now.map((row) => row.userId)).size,
          acRate: Math.round(acRate * 10) / 10,
          previousAcRate: before === null ? null : Math.round(before * 10) / 10,
          suspicious: before !== null && entry.now.length >= 5 && entry.before.length >= 5 && before - acRate >= 25,
          avgRuntimeMs: acRuns.length ? Math.round(acRuns.reduce((sum, row) => sum + (row.durationMs ?? 0), 0) / acRuns.length) : null,
        };
      })
      .sort((a, b) => Number(b.suspicious) - Number(a.suspicious) || b.submissions - a.submissions);
    const languages = new Map<string, { count: number; ac: number }>();
    for (const row of current) {
      const entry = languages.get(row.language) ?? { count: 0, ac: 0 };
      entry.count += 1;
      if (row.verdict === 'ac') entry.ac += 1;
      languages.set(row.language, entry);
    }
    return {
      range,
      total: current.length,
      previousTotal: previous.length,
      learners: new Set(current.map((row) => row.userId)).size,
      acceptance: current.length ? Math.round((accepted.length / current.length) * 1000) / 10 : 0,
      previousAcceptance: previous.length ? Math.round((previous.filter((row) => row.verdict === 'ac').length / previous.length) * 1000) / 10 : null,
      avgRuntimeMs: accepted.length ? Math.round(accepted.reduce((sum, row) => sum + (row.durationMs ?? 0), 0) / accepted.length) : null,
      verdicts,
      series,
      problems: problems.slice(0, 50),
      languages: [...languages.entries()].map(([slug, entry]) => ({ language: languageName(slug), slug, count: entry.count, acRate: Math.round((entry.ac / entry.count) * 1000) / 10 })).sort((a, b) => b.count - a.count),
    };
  }

  async override(id: string, verdict: string, reason: string, actor: AdminActor) {
    if (!(VERDICTS as readonly string[]).includes(verdict)) throw new BadRequestException(`Verdict must be one of: ${VERDICTS.join(', ')}`);
    const row = await this.prisma.codeRun.findUnique({ where: { id } });
    if (!row || row.kind !== 'submit' || row.rejudgeOfId || row.state !== 'done') throw new NotFoundException('Submission not found.');
    if (row.verdict === verdict) return this.get(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.codeRun.update({ where: { id }, data: { verdict, originalVerdict: row.originalVerdict ?? row.verdict, overrideReason: reason.trim(), outcome: verdict === 'ac' ? 'ok' : verdict === 'wa' ? 'wrong' : verdict } });
      await this.audit.record(tx, actor, { action: 'submission.override', entityType: 'code_run', entityId: id, summary: `Changed a ${row.problemSlug} verdict from ${row.verdict} to ${verdict}`, changes: { before: row.verdict, after: verdict, reason: reason.trim() } });
    });
    return this.get(id);
  }

  private presentJob(job: { id: string; problemSlug: string; scope: string; since: Date | null; total: number; done: number; status: string; changes: Prisma.JsonValue; createdAt: Date; finishedAt: Date | null; startedBy: { name: string } | null }, titles: Map<string, { title: string }>) {
    return {
      id: job.id,
      problem: { slug: job.problemSlug, title: titles.get(job.problemSlug)?.title ?? job.problemSlug },
      scope: job.scope,
      since: job.since?.getTime() ?? null,
      total: job.total,
      done: job.done,
      progress: job.total ? Math.round((job.done / job.total) * 100) : 100,
      status: job.status,
      changes: job.changes as Record<string, number>,
      startedAt: job.createdAt.getTime(),
      finishedAt: job.finishedAt?.getTime() ?? null,
      startedBy: job.startedBy?.name ?? null,
    };
  }

  async jobs() {
    const rows = await this.prisma.rejudgeJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { startedBy: { select: { name: true } } } });
    const titles = await problemTitles(this.prisma, rows.map((row) => row.problemSlug));
    return rows.map((row) => this.presentJob(row, titles));
  }

  async job(id: string) {
    const row = await this.prisma.rejudgeJob.findUnique({ where: { id }, include: { startedBy: { select: { name: true } } } });
    if (!row) throw new NotFoundException('Rejudge job not found.');
    return this.presentJob(row, await problemTitles(this.prisma, [row.problemSlug]));
  }

  async preview(problemSlug: string, scope: string, since: number | null) {
    const targets = await this.targets(problemSlug, scope, since);
    return { count: targets.length, capped: targets.length === REJUDGE_LIMIT };
  }

  private targets(problemSlug: string, scope: string, since: number | null) {
    if (!['all', 'since', 'failed'].includes(scope)) throw new BadRequestException('Scope must be all, since or failed.');
    if (scope === 'since' && (!since || since > Date.now())) throw new BadRequestException('Pick a start time in the past.');
    return this.prisma.codeRun.findMany({
      where: { ...BASE, problemSlug, ...(scope === 'failed' ? { verdict: { not: 'ac' } } : {}), ...(scope === 'since' ? { queuedAt: { gte: new Date(since!) } } : {}) },
      orderBy: { queuedAt: 'asc' },
      take: REJUDGE_LIMIT,
      select: { id: true, userId: true, problemSlug: true, language: true, code: true, verdict: true, originalVerdict: true },
    });
  }

  async startRejudge(problemSlug: string, scope: string, since: number | null, actor: AdminActor) {
    if (await this.prisma.rejudgeJob.findFirst({ where: { problemSlug, status: 'running' } })) throw new ConflictException('A rejudge is already running for this problem.');
    const targets = await this.targets(problemSlug, scope, since);
    if (!targets.length) throw new BadRequestException('No submissions match this scope.');
    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.rejudgeJob.create({ data: { problemSlug, scope, since: since ? new Date(since) : null, total: targets.length, startedById: actor.id } });
      await this.audit.record(tx, actor, { action: 'submission.rejudge', entityType: 'rejudge_job', entityId: created.id, summary: `Started rejudging ${targets.length} ${problemSlug} submission${targets.length === 1 ? '' : 's'} (${scope})` });
      return created;
    });
    void this.runJob(job.id, targets);
    return this.job(job.id);
  }

  private async runJob(jobId: string, targets: Awaited<ReturnType<SubmissionsAdminService['targets']>>) {
    const changes: Record<string, number> = {};
    let done = 0;
    let cursor = 0;
    const worker = async () => {
      while (cursor < targets.length && !this.cancelled.has(jobId)) {
        const target = targets[cursor++];
        try {
          const record = await this.submissions.rejudge(target, jobId);
          const next = record.verdict ?? 'wa';
          if (next !== target.verdict) {
            const key = `${target.verdict}>${next}`;
            changes[key] = (changes[key] ?? 0) + 1;
            await this.prisma.codeRun.update({
              where: { id: target.id },
              data: { verdict: next, outcome: record.outcome, originalVerdict: target.originalVerdict ?? target.verdict, overrideReason: `Rejudge ${jobId}`, testsPassed: record.testsPassed ?? null, testsTotal: record.testsTotal ?? null, results: record.results === undefined ? undefined : (record.results as Prisma.InputJsonValue) },
            });
          }
        } catch {
          changes.error = (changes.error ?? 0) + 1;
        }
        done += 1;
        await this.prisma.rejudgeJob.update({ where: { id: jobId }, data: { done, changes } });
      }
    };
    await Promise.all([worker(), worker()]);
    const cancelled = this.cancelled.delete(jobId);
    await this.prisma.rejudgeJob.update({ where: { id: jobId }, data: { status: cancelled ? 'cancelled' : 'done', done, changes, finishedAt: new Date() } });
  }

  async cancelJob(id: string, actor: AdminActor) {
    const job = await this.prisma.rejudgeJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Rejudge job not found.');
    if (job.status !== 'running') throw new ConflictException('This rejudge has already finished.');
    this.cancelled.add(id);
    await this.audit.record(this.prisma, actor, { action: 'submission.rejudge_cancel', entityType: 'rejudge_job', entityId: id, summary: `Cancelled the ${job.problemSlug} rejudge after ${job.done} of ${job.total}` });
    return this.job(id);
  }

  async plagiarism(problemSlug: string | undefined, range: SubRange | 'all', threshold: number) {
    if (!Number.isFinite(threshold) || threshold < 50 || threshold > 100) throw new BadRequestException('Threshold must be from 50 to 100.');
    const where: Prisma.CodeRunWhereInput = { ...BASE, verdict: 'ac', userId: { not: null }, ...(problemSlug ? { problemSlug } : {}), ...(range === 'all' ? {} : { queuedAt: { gte: new Date(Date.now() - SUB_RANGES[range].ms) } }) };
    const rows = await this.prisma.codeRun.findMany({ where, orderBy: { queuedAt: 'desc' }, include: RUN_INCLUDE, take: 3000 });
    const latest = new Map<string, RunRow>();
    for (const row of rows) {
      const key = `${row.problemSlug}|${row.userId}`;
      if (!latest.has(key)) latest.set(key, row);
    }
    const groups = new Map<string, RunRow[]>();
    for (const row of latest.values()) {
      const list = groups.get(row.problemSlug) ?? [];
      if (list.length < PLAGIARISM_PER_PROBLEM) list.push(row);
      groups.set(row.problemSlug, list);
    }
    const pairs: { a: RunRow; b: RunRow; score: number }[] = [];
    for (const list of groups.values()) {
      const prints = list.map((row) => fingerprint(row.code));
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const score = similarity(prints[i], prints[j]);
          if (score >= threshold) pairs.push(list[i].queuedAt <= list[j].queuedAt ? { a: list[i], b: list[j], score } : { a: list[j], b: list[i], score });
        }
      }
    }
    pairs.sort((x, y) => y.score - x.score);
    const top = pairs.slice(0, PAIR_LIMIT);
    const decisions = await this.prisma.plagiarismFlag.findMany({ where: { OR: top.map((pair) => ({ runAId: pair.a.id, runBId: pair.b.id })) } });
    const decided = new Map(decisions.map((row) => [`${row.runAId}:${row.runBId}`, row]));
    const titles = await problemTitles(this.prisma, top.map((pair) => pair.a.problemSlug));
    const side = (row: RunRow) => ({ runId: row.id, learner: row.user?.name ?? 'Deleted user', email: row.user?.email ?? null, language: languageName(row.language), t: row.queuedAt.getTime() });
    const setting = await this.prisma.platformSetting.findUnique({ where: { section: 'execution' } });
    return {
      enabled: ((setting?.values ?? {}) as { plagiarismCheck?: boolean }).plagiarismCheck ?? true,
      threshold,
      compared: latest.size,
      items: top.map((pair) => {
        const decision = decided.get(`${pair.a.id}:${pair.b.id}`);
        return {
          id: `${pair.a.id}:${pair.b.id}`,
          problem: { slug: pair.a.problemSlug, title: titles.get(pair.a.problemSlug)?.title ?? pair.a.problemSlug },
          similarity: pair.score,
          first: side(pair.a),
          second: side(pair.b),
          decision: decision ? { decision: decision.decision, by: decision.decidedBy, at: decision.decidedAt.getTime() } : null,
        };
      }),
    };
  }

  private async pair(runAId: string, runBId: string) {
    const [a, b] = await Promise.all([
      this.prisma.codeRun.findUnique({ where: { id: runAId }, include: RUN_INCLUDE }),
      this.prisma.codeRun.findUnique({ where: { id: runBId }, include: RUN_INCLUDE }),
    ]);
    if (!a || !b || a.kind !== 'submit' || b.kind !== 'submit') throw new NotFoundException('Submission not found.');
    if (a.problemSlug !== b.problemSlug) throw new BadRequestException('Both submissions must be for the same problem.');
    if (a.userId === b.userId) throw new BadRequestException('Both submissions are from the same learner.');
    return a.queuedAt <= b.queuedAt ? [a, b] : [b, a];
  }

  async compare(runAId: string, runBId: string) {
    const [a, b] = await this.pair(runAId, runBId);
    const side = (row: RunRow) => ({ runId: row.id, learner: row.user?.name ?? 'Deleted user', email: row.user?.email ?? null, language: languageName(row.language), t: row.queuedAt.getTime(), code: row.code });
    const decision = await this.prisma.plagiarismFlag.findUnique({ where: { runAId_runBId: { runAId: a.id, runBId: b.id } } });
    return { similarity: similarity(fingerprint(a.code), fingerprint(b.code)), first: side(a), second: side(b), decision: decision ? { decision: decision.decision, by: decision.decidedBy, at: decision.decidedAt.getTime() } : null };
  }

  async decide(runAId: string, runBId: string, decision: 'confirmed' | 'dismissed' | null, actor: AdminActor) {
    const [a, b] = await this.pair(runAId, runBId);
    const key = { runAId_runBId: { runAId: a.id, runBId: b.id } };
    if (decision === null) {
      await this.prisma.plagiarismFlag.deleteMany({ where: { runAId: a.id, runBId: b.id } });
    } else {
      const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
      const score = similarity(fingerprint(a.code), fingerprint(b.code));
      await this.prisma.plagiarismFlag.upsert({ where: key, create: { problemSlug: a.problemSlug, runAId: a.id, runBId: b.id, similarity: score, decision, decidedBy: user?.name ?? actor.email }, update: { decision, similarity: score, decidedBy: user?.name ?? actor.email, decidedAt: new Date() } });
    }
    await this.audit.record(this.prisma, actor, {
      action: decision === null ? 'plagiarism.reopen' : `plagiarism.${decision}`,
      entityType: 'plagiarism_flag',
      entityId: `${a.id}:${b.id}`,
      summary: decision === null ? `Reopened a ${a.problemSlug} plagiarism match` : `${decision === 'confirmed' ? 'Confirmed' : 'Dismissed'} a ${a.problemSlug} plagiarism match between ${a.user?.name ?? 'a learner'} and ${b.user?.name ?? 'a learner'}`,
    });
    return this.compare(a.id, b.id);
  }
}