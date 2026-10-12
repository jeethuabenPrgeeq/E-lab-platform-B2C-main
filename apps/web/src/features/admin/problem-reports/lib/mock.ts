'use client';

import { useCallback, useEffect, useState } from 'react';
import { ME } from './shared';
import type { ActivityItem, LearnerReport, ProblemReport, ReportCategory, ReportStatus, ResolutionType } from './types';

const KEY = 'elab_problem_reports_v1';
const H = 3_600_000;
const LANGS = ['Python', 'Java', 'C++', 'JavaScript', 'C'];

interface SeedDef {
  title: string;
  problem: string;
  difficulty: ProblemReport['difficulty'];
  category: ReportCategory;
  status: ReportStatus;
  assignee: string | null;
  ageHours: number;
  messages: string[];
  resolution?: { type: ResolutionType; note: string; afterHours: number };
}

const SEEDS: SeedDef[] = [
  {
    title: 'Hidden test 15 expects intervals that should have merged',
    problem: 'Merge Intervals',
    difficulty: 'medium',
    category: 'wrong_testcase',
    status: 'open',
    assignee: null,
    ageHours: 46,
    messages: [
      'My solution passes 14/15. Test 15 seems to expect [1,4] and [4,5] to stay separate, but touching intervals should merge.',
      'Same here — test 15 fails for every correct solution I tried. The statement says touching intervals merge.',
      'Checked with a brute force solution, test 15 output looks wrong.',
      'Failing on hidden test 15 only. Pretty sure the expected output is wrong.',
      'Test 15 contradicts example 2 in the statement.',
      'Lost my streak because of test 15 :(',
      'Hidden test 15 wrong?',
      'Please check test 15, the expected answer does not merge [4,5].',
    ],
  },
  {
    title: 'Python recursion limit hit on valid input',
    problem: 'Fibonacci (Recursive)',
    difficulty: 'easy',
    category: 'compiler',
    status: 'in_review',
    assignee: 'Ravi K',
    ageHours: 30,
    messages: [
      'RecursionError at n=1000 even though the problem asks for a recursive solution. Can the limit be raised?',
      'Python recursion depth exceeded on the last test. Java passes with the same logic.',
      'Same RecursionError on test 8.',
    ],
  },
  {
    title: 'Does "second largest" mean distinct values?',
    problem: 'Second Largest Element',
    difficulty: 'easy',
    category: 'unclear_statement',
    status: 'open',
    assignee: null,
    ageHours: 20,
    messages: [
      'For [5, 5, 3] should the answer be 5 or 3? The statement does not say if duplicates count.',
      'Unclear whether duplicates are allowed. I guessed distinct and got WA on test 4.',
    ],
  },
  {
    title: 'Expected output has a trailing space',
    problem: 'Matrix Spiral',
    difficulty: 'medium',
    category: 'wrong_output',
    status: 'open',
    assignee: 'You',
    ageHours: 9,
    messages: [
      'Sample output seems to require a trailing space after the last number, otherwise WA.',
      'Got WA only because I did not print a space at the end. Is the checker strict on whitespace?',
      'Trailing whitespace makes or breaks test 3.',
    ],
  },
  {
    title: 'Typo in the constraints: 10^5 shown as 105',
    problem: 'Two Sum',
    difficulty: 'easy',
    category: 'typo',
    status: 'open',
    assignee: null,
    ageHours: 5,
    messages: ['Constraints say n ≤ 105, I think it should be 10^5.'],
  },
  {
    title: 'Time limit too strict for Java',
    problem: 'Dijkstra Shortest Path',
    difficulty: 'hard',
    category: 'compiler',
    status: 'open',
    assignee: null,
    ageHours: 70,
    messages: [
      'O((V+E) log V) with PriorityQueue still TLEs on test 17 in Java. Same algorithm passes in C++.',
      'Java needs a higher multiplier on this problem.',
    ],
  },
  {
    title: 'Example 3 explanation does not match the output',
    problem: 'Balanced Brackets',
    difficulty: 'medium',
    category: 'unclear_statement',
    status: 'in_review',
    assignee: 'You',
    ageHours: 52,
    messages: ['Example 3 says "{[}]" is balanced in the explanation but the output shows NO.'],
  },
  {
    title: 'Capacity 0 is not handled by the reference',
    problem: 'LRU Cache',
    difficulty: 'hard',
    category: 'wrong_testcase',
    status: 'resolved',
    assignee: 'Ravi K',
    ageHours: 120,
    messages: [
      'Test 19 uses capacity 0 but the constraints say capacity ≥ 1.',
      'Capacity 0 in test 19 is outside the constraints.',
      'Test 19 breaks the stated constraints.',
    ],
    resolution: { type: 'fixed_testcase', note: 'Removed the capacity 0 case from test 19 and rejudged 214 submissions.', afterHours: 20 },
  },
  {
    title: 'Kth smallest: k can be larger than n?',
    problem: 'Kth Smallest',
    difficulty: 'medium',
    category: 'unclear_statement',
    status: 'resolved',
    assignee: 'Meera S',
    ageHours: 160,
    messages: ['What should we print if k > n?', 'Not specified what happens when k exceeds array length.'],
    resolution: { type: 'updated_statement', note: 'Added "1 ≤ k ≤ n" to the constraints.', afterHours: 6 },
  },
  {
    title: 'My answer is correct but marked wrong',
    problem: 'Reverse a String',
    difficulty: 'easy',
    category: 'other',
    status: 'rejected',
    assignee: 'Meera S',
    ageHours: 96,
    messages: ['I reversed the words instead of characters and it says WA.'],
    resolution: { type: 'not_a_bug', note: 'The problem asks to reverse characters, not words. Replied with a hint.', afterHours: 3 },
  },
  {
    title: 'Largest of Three accepts input on one line only',
    problem: 'Largest of Three',
    difficulty: 'easy',
    category: 'wrong_testcase',
    status: 'open',
    assignee: null,
    ageHours: 2,
    messages: ['Input in test 2 is split over three lines but the statement says one line.'],
  },
  {
    title: 'Palindrome check — should spaces be ignored?',
    problem: 'Palindrome Check',
    difficulty: 'easy',
    category: 'unclear_statement',
    status: 'rejected',
    assignee: 'Ravi K',
    ageHours: 210,
    messages: ['"never odd or even" — is that a palindrome here?'],
    resolution: { type: 'duplicate', note: 'Duplicate of an earlier report; statement already clarified.', afterHours: 1 },
  },
];

function seed(now: number): ProblemReport[] {
  return SEEDS.map((def, index) => {
    const createdAt = now - def.ageHours * H;
    const step = (def.ageHours * H * 0.8) / Math.max(1, def.messages.length);
    const reports: LearnerReport[] = def.messages.map((message, i) => ({
      learner: `L-${1100 + ((index * 97 + i * 31) % 2300)}`,
      at: createdAt + i * step,
      message,
      submissionId: def.category === 'unclear_statement' || def.category === 'typo' ? null : `S-${(9_000_000 + index * 977 + i * 131).toString(36).toUpperCase()}`,
      language: LANGS[(index + i) % LANGS.length],
    }));
    const activity: ActivityItem[] = [{ at: createdAt, actor: reports[0].learner, text: 'Reported the problem', kind: 'report' }];
    if (reports.length > 1) activity.push({ at: reports[reports.length - 1].at, actor: 'System', text: `${reports.length - 1} more learners reported the same issue`, kind: 'report' });
    if (def.assignee) activity.push({ at: createdAt + 0.25 * def.ageHours * H, actor: 'System', text: `Assigned to ${def.assignee}`, kind: 'assign' });
    if (def.status === 'in_review') activity.push({ at: createdAt + 0.3 * def.ageHours * H, actor: def.assignee ?? 'System', text: 'Started review', kind: 'status' });
    let resolution: ProblemReport['resolution'] = null;
    if (def.resolution) {
      const at = createdAt + def.resolution.afterHours * H;
      resolution = { type: def.resolution.type, note: def.resolution.note, at };
      activity.push({ at, actor: def.assignee ?? 'System', text: `${def.status === 'resolved' ? 'Resolved' : 'Rejected'}: ${def.resolution.note}`, kind: 'status' });
    }
    activity.sort((a, b) => a.at - b.at);
    return {
      id: `PR-${1040 + index}`,
      title: def.title,
      problem: def.problem,
      difficulty: def.difficulty,
      category: def.category,
      status: def.status,
      assignee: def.assignee,
      createdAt,
      updatedAt: activity[activity.length - 1].at,
      reports,
      activity,
      resolution,
    };
  });
}

function load(): ProblemReport[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProblemReport[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

export function useProblemReports() {
  const [items, setItems] = useState<ProblemReport[] | null>(null);

  useEffect(() => {
    setItems(load());
  }, []);

  const mutate = useCallback((id: string, fn: (report: ProblemReport, now: number) => ProblemReport) => {
    setItems((current) => {
      if (!current) return current;
      const now = Date.now();
      const next = current.map((report) => (report.id === id ? { ...fn(report, now), updatedAt: now } : report));
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const log = (report: ProblemReport, now: number, text: string, kind: ActivityItem['kind']) => [...report.activity, { at: now, actor: ME, text, kind }];

  const assign = useCallback(
    (id: string, assignee: string | null) =>
      mutate(id, (report, now) => ({
        ...report,
        assignee,
        activity: log(report, now, assignee ? `Assigned to ${assignee === ME ? 'themselves' : assignee}` : 'Removed the assignee', 'assign'),
      })),
    [mutate],
  );

  const startReview = useCallback(
    (id: string) =>
      mutate(id, (report, now) => ({
        ...report,
        status: 'in_review',
        assignee: report.assignee ?? ME,
        activity: log(report, now, 'Started review', 'status'),
      })),
    [mutate],
  );

  const close = useCallback(
    (id: string, status: 'resolved' | 'rejected', type: ResolutionType, note: string) =>
      mutate(id, (report, now) => ({
        ...report,
        status,
        assignee: report.assignee ?? ME,
        resolution: { type, note, at: now },
        activity: log(report, now, `${status === 'resolved' ? 'Resolved' : 'Rejected'}: ${note}`, 'status'),
      })),
    [mutate],
  );

  const reopen = useCallback(
    (id: string) =>
      mutate(id, (report, now) => ({ ...report, status: 'open', resolution: null, activity: log(report, now, 'Reopened the report', 'status') })),
    [mutate],
  );

  const reply = useCallback(
    (id: string, message: string) =>
      mutate(id, (report, now) => {
        const learners = new Set(report.reports.map((item) => item.learner)).size;
        return { ...report, activity: log(report, now, `Replied to ${learners} learner${learners === 1 ? '' : 's'}: “${message}”`, 'reply') };
      }),
    [mutate],
  );

  const note = useCallback((id: string, text: string) => mutate(id, (report, now) => ({ ...report, activity: log(report, now, text, 'note') })), [mutate]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setItems(seed(Date.now()));
  }, []);

  return { items: items ?? [], loaded: items !== null, assign, startReview, close, reopen, reply, note, reset };
}