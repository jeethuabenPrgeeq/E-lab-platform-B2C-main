import { LANGUAGES, PROBLEMS } from './data';
import { HOUR, SUB_RANGES, VERDICTS } from './shared';
import { effectiveVerdict } from './store';
import type { PersistState, SubRange, Submission, Verdict } from './types';

export function lowerBound(all: Submission[], t: number) {
  let lo = 0;
  let hi = all.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (all[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function slice(all: Submission[], from: number, to: number) {
  return all.slice(lowerBound(all, from), lowerBound(all, to));
}

export interface SubSummary {
  total: number;
  accepted: number;
  acceptance: number;
  learners: number;
  avgAttempts: number;
  verdicts: Record<Verdict, number>;
  languages: { index: number; total: number; accepted: number }[];
}

export function summarize(subs: Submission[], persist: PersistState): SubSummary {
  const verdicts = Object.fromEntries(VERDICTS.map((verdict) => [verdict, 0])) as Record<Verdict, number>;
  const learners = new Set<string>();
  const languages = LANGUAGES.map((_, index) => ({ index, total: 0, accepted: 0 }));
  let attemptSum = 0;
  for (const sub of subs) {
    const verdict = effectiveVerdict(sub, persist);
    verdicts[verdict] += 1;
    languages[sub.language].total += 1;
    if (verdict === 'ac') languages[sub.language].accepted += 1;
    learners.add(sub.learner);
    if (verdict === 'ac') attemptSum += sub.attempt;
  }
  return {
    total: subs.length,
    accepted: verdicts.ac,
    acceptance: subs.length ? verdicts.ac / subs.length : 0,
    learners: learners.size,
    avgAttempts: verdicts.ac ? attemptSum / verdicts.ac : 0,
    verdicts,
    languages: languages.filter((item) => item.total > 0).sort((a, b) => b.total - a.total),
  };
}

export function series(all: Submission[], range: SubRange, end: number, persist: PersistState) {
  const def = SUB_RANGES.find((item) => item.value === range)!;
  const size = def.bucketHours * HOUR;
  const count = def.hours / def.bucketHours;
  return Array.from({ length: count }, (_, index) => {
    const t = end - (count - index) * size;
    const subs = slice(all, t, t + size);
    let accepted = 0;
    for (const sub of subs) if (effectiveVerdict(sub, persist) === 'ac') accepted += 1;
    return { t, total: subs.length, accepted };
  });
}

export interface ProblemHealth {
  index: number;
  recentTotal: number;
  recentAc: number;
  baseTotal: number;
  baseAc: number;
  drop: number;
  status: 'broken' | 'low' | 'ok';
}

export function problemHealth(all: Submission[], now: number, persist: PersistState): ProblemHealth[] {
  const split = now - 48 * HOUR;
  const start = now - 30 * 24 * HOUR;
  const stats = PROBLEMS.map((_, index) => ({ index, recentTotal: 0, recentAc: 0, baseTotal: 0, baseAc: 0 }));
  for (const sub of slice(all, start, now + 1)) {
    const stat = stats[sub.problem];
    const ac = effectiveVerdict(sub, persist) === 'ac' ? 1 : 0;
    if (sub.t >= split) {
      stat.recentTotal += 1;
      stat.recentAc += ac;
    } else {
      stat.baseTotal += 1;
      stat.baseAc += ac;
    }
  }
  return stats
    .map((stat) => {
      const recent = stat.recentTotal ? stat.recentAc / stat.recentTotal : 0;
      const base = stat.baseTotal ? stat.baseAc / stat.baseTotal : 0;
      const drop = base - recent;
      const status: ProblemHealth['status'] =
        stat.recentTotal >= 20 && drop >= 0.2 ? 'broken' : stat.recentTotal >= 20 && recent < 0.2 ? 'low' : 'ok';
      return { ...stat, drop, status };
    })
    .sort((a, b) => b.drop - a.drop);
}

export function findMatch(all: Submission[], sub: Submission) {
  const index = lowerBound(all, sub.t);
  for (let i = index - 1; i >= 0 && i > index - 4000; i -= 1) {
    const other = all[i];
    if (other.problem === sub.problem && other.language === sub.language && other.verdict === 'ac' && other.learner !== sub.learner) return other;
  }
  return null;
}