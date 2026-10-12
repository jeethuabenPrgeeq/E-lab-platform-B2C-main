import { BadRequestException, Injectable } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface JudgeLimits {
  timeLimitMs: number;
  compileTimeoutMs: number;
  memoryLimitMb: number;
  outputLimitKb: number;
  maxProcesses: number;
  maxConcurrentPerLearner: number;
  submissionsPerMinute: number;
  networkAccess: boolean;
  sandboxProfile: 'strict' | 'standard' | 'relaxed';
}

export const DEFAULT_LIMITS: JudgeLimits = {
  timeLimitMs: 5000,
  compileTimeoutMs: 15000,
  memoryLimitMb: 512,
  outputLimitKb: 256,
  maxProcesses: 64,
  maxConcurrentPerLearner: 2,
  submissionsPerMinute: 10,
  networkAccess: false,
  sandboxProfile: 'strict',
};

const LIMIT_RANGES: Record<Exclude<keyof JudgeLimits, 'networkAccess' | 'sandboxProfile'>, [number, number]> = {
  timeLimitMs: [100, 20000],
  compileTimeoutMs: [1000, 60000],
  memoryLimitMb: [16, 4096],
  outputLimitKb: [1, 10240],
  maxProcesses: [1, 512],
  maxConcurrentPerLearner: [1, 20],
  submissionsPerMinute: [1, 120],
};

type Section = 'judge_limits' | 'judge_queue';

@Injectable()
export class JudgeSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async read<T>(section: Section, fallback: T): Promise<T & { updatedAt: number | null; updatedBy: string | null }> {
    const row = await this.prisma.platformSetting.findUnique({ where: { section } });
    return { ...fallback, ...((row?.values ?? {}) as Partial<T>), updatedAt: row?.updatedAt.getTime() ?? null, updatedBy: row?.updatedByName ?? null };
  }

  private write(section: Section, values: unknown, by: { id: string; name: string } | null) {
    const data = { values: values as Prisma.InputJsonValue, updatedById: by?.id ?? null, updatedByName: by?.name ?? null };
    return this.prisma.platformSetting.upsert({ where: { section }, create: { section, ...data }, update: data });
  }

  async limits() {
    return this.read<JudgeLimits>('judge_limits', DEFAULT_LIMITS);
  }

  async effective() {
    const [limits, execution] = await Promise.all([
      this.limits(),
      this.prisma.platformSetting.findUnique({ where: { section: 'execution' } }),
    ]);
    const values = (execution?.values ?? {}) as { timeLimit?: number; memoryLimit?: number; submissionsPerMinute?: number };
    const base = Object.fromEntries((Object.keys(DEFAULT_LIMITS) as (keyof JudgeLimits)[]).map((key) => [key, limits[key]])) as unknown as JudgeLimits;
    return {
      ...base,
      timeLimitMs: Math.min(limits.timeLimitMs, (values.timeLimit ?? 2) * 1000),
      memoryLimitMb: Math.min(limits.memoryLimitMb, values.memoryLimit ?? 256),
      submissionsPerMinute: Math.min(limits.submissionsPerMinute, values.submissionsPerMinute ?? 10),
    };
  }

  async queuePaused() {
    return (await this.read<{ paused: boolean }>('judge_queue', { paused: false })).paused;
  }

  setQueuePaused(paused: boolean, by: { id: string; name: string }) {
    return this.write('judge_queue', { paused }, by);
  }

  validateLimits(input: Record<string, unknown>) {
    const current = { ...DEFAULT_LIMITS };
    const issues: Record<string, string> = {};
    for (const [key, [min, max]] of Object.entries(LIMIT_RANGES)) {
      const value = input[key];
      if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) issues[key] = `Whole number from ${min} to ${max}`;
      else (current as Record<string, unknown>)[key] = value;
    }
    if (typeof input.networkAccess !== 'boolean') issues.networkAccess = 'Must be on or off';
    else current.networkAccess = input.networkAccess;
    if (!['strict', 'standard', 'relaxed'].includes(String(input.sandboxProfile))) issues.sandboxProfile = 'Pick strict, standard or relaxed';
    else current.sandboxProfile = input.sandboxProfile as JudgeLimits['sandboxProfile'];
    if (current.compileTimeoutMs < current.timeLimitMs) issues.compileTimeoutMs = 'Must be at least the run time limit';
    if (Object.keys(issues).length) throw new BadRequestException({ message: 'Some limits are out of range.', issues });
    return current;
  }

  saveLimits(limits: JudgeLimits, by: { id: string; name: string }) {
    return this.write('judge_limits', limits, by);
  }
}