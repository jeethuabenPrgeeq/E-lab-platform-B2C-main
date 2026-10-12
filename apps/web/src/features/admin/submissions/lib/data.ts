import { DAY, HOUR } from './shared';
import type { LanguageDef, ProblemDef, Submission, TestResult, Verdict } from './types';

export const PROBLEMS: ProblemDef[] = [
  { id: 'p-reverse', title: 'Reverse a String', difficulty: 'easy', baseAc: 0.72, tests: 8, weight: 12, fn: 'reverseString' },
  { id: 'p-palindrome', title: 'Palindrome Check', difficulty: 'easy', baseAc: 0.68, tests: 10, weight: 11, fn: 'isPalindrome' },
  { id: 'p-two-sum', title: 'Two Sum', difficulty: 'easy', baseAc: 0.61, tests: 12, weight: 12, fn: 'twoSum' },
  { id: 'p-largest', title: 'Largest of Three', difficulty: 'easy', baseAc: 0.8, tests: 6, weight: 8, fn: 'largestOfThree' },
  { id: 'p-brackets', title: 'Balanced Brackets', difficulty: 'medium', baseAc: 0.46, tests: 14, weight: 9, fn: 'isBalanced' },
  { id: 'p-second', title: 'Second Largest Element', difficulty: 'easy', baseAc: 0.64, tests: 10, weight: 9, fn: 'secondLargest' },
  { id: 'p-merge', title: 'Merge Intervals', difficulty: 'medium', baseAc: 0.41, tests: 15, weight: 10, fn: 'mergeIntervals' },
  { id: 'p-fib', title: 'Fibonacci (Recursive)', difficulty: 'easy', baseAc: 0.58, tests: 8, weight: 8, fn: 'fibonacci' },
  { id: 'p-lru', title: 'LRU Cache', difficulty: 'hard', baseAc: 0.22, tests: 20, weight: 5, fn: 'lruCache' },
  { id: 'p-dijkstra', title: 'Dijkstra Shortest Path', difficulty: 'hard', baseAc: 0.19, tests: 18, weight: 4, fn: 'shortestPath' },
  { id: 'p-spiral', title: 'Matrix Spiral', difficulty: 'medium', baseAc: 0.37, tests: 12, weight: 6, fn: 'spiralOrder' },
  { id: 'p-kth', title: 'Kth Smallest', difficulty: 'medium', baseAc: 0.43, tests: 14, weight: 6, fn: 'kthSmallest' },
];

export const BROKEN_PROBLEM = 6;

export const LANGUAGES: LanguageDef[] = [
  { name: 'Python', factor: 3, memMb: 14, weight: 34 },
  { name: 'Java', factor: 2.2, memMb: 48, weight: 24 },
  { name: 'C++', factor: 1, memMb: 4, weight: 16 },
  { name: 'JavaScript', factor: 1.8, memMb: 36, weight: 18 },
  { name: 'C', factor: 0.9, memMb: 2, weight: 8 },
];

export const TIME_LIMIT_MS = 2000;
export const MEMORY_LIMIT_MB = 256;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weighted<T extends { weight: number }>(items: T[], roll: number) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let left = roll * total;
  for (let index = 0; index < items.length; index += 1) {
    left -= items[index].weight;
    if (left <= 0) return index;
  }
  return items.length - 1;
}

export function brokenFrom(now: number) {
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  return midnight.getTime() - 2 * DAY;
}

function hourlyRate(hourStart: number) {
  const date = new Date(hourStart);
  const hour = date.getHours();
  const curve = (Math.sin((2 * Math.PI * (hour - 9)) / 24) + 1) / 2;
  const weekend = date.getDay() === 0 || date.getDay() === 6 ? 0.7 : 1;
  return 48 * (0.3 + 0.7 * curve) * weekend;
}

const FAIL_SPLIT: [Verdict, number][] = [
  ['wa', 0.55],
  ['tle', 0.15],
  ['re', 0.12],
  ['ce', 0.1],
  ['mle', 0.08],
];

export function generateHour(hourIndex: number, brokenStart: number): Submission[] {
  const random = rng(hourIndex * 2654435761);
  const start = hourIndex * HOUR;
  const expected = hourlyRate(start);
  const count = Math.max(0, Math.min(99, Math.round(expected + (random() - 0.5) * Math.sqrt(expected) * 2)));
  const times = Array.from({ length: count }, () => start + Math.floor(random() * HOUR)).sort((a, b) => a - b);

  return times.map((t, index) => {
    const problemIndex = weighted(PROBLEMS, random());
    const problem = PROBLEMS[problemIndex];
    const language = weighted(LANGUAGES, random());
    const attempt = 1 + Math.min(5, Math.floor(-Math.log(1 - random() * 0.97) / 0.7));
    const pAc = Math.min(0.95, problem.baseAc + 0.07 * (attempt - 1));

    let trueVerdict: Verdict = 'ac';
    if (random() >= pAc) {
      let roll = random();
      trueVerdict = 'wa';
      for (const [verdict, share] of FAIL_SPLIT) {
        if (roll < share) {
          trueVerdict = verdict;
          break;
        }
        roll -= share;
      }
    }
    const flakyTle = trueVerdict === 'ac' && random() < 0.03;
    const broken = problemIndex === BROKEN_PROBLEM && t >= brokenStart && trueVerdict === 'ac';
    const verdict: Verdict = broken ? 'wa' : flakyTle ? 'tle' : trueVerdict;

    const total = problem.tests;
    const passed =
      verdict === 'ac' ? total : verdict === 'ce' ? 0 : broken ? total - 1 : Math.floor(random() * Math.max(1, total - 1));
    const lang = LANGUAGES[language];
    const base = (problem.difficulty === 'hard' ? 90 : problem.difficulty === 'medium' ? 45 : 18) * lang.factor;
    let runtimeMs = Math.round(base * Math.exp((random() - 0.5) * 1.2));
    if (verdict === 'tle') runtimeMs = TIME_LIMIT_MS;
    if (verdict === 'ce') runtimeMs = 0;
    let memoryMb = Math.round(lang.memMb * (1 + random() * 0.6) * 10) / 10;
    if (verdict === 'mle') memoryMb = MEMORY_LIMIT_MB;
    if (verdict === 'ce') memoryMb = 0;

    const flagged = verdict === 'ac' && problem.difficulty !== 'easy' && random() < 0.012;
    const similarity = flagged ? 80 + Math.floor(random() * 20) : 0;

    return {
      id: `S-${(hourIndex * 100 + index).toString(36).toUpperCase()}`,
      t,
      problem: problemIndex,
      language,
      learner: `L-${1000 + Math.floor(random() * 2400)}`,
      verdict,
      trueVerdict,
      broken,
      testsPassed: passed,
      testsTotal: total,
      runtimeMs,
      memoryMb,
      attempt,
      similarity,
      seed: Math.floor(random() * 1e9),
    };
  });
}

const NAMES = {
  arg: ['nums', 'arr', 'values', 'data', 'items', 'xs'],
  res: ['result', 'best', 'ans', 'output', 'acc', 'answer'],
  it: ['x', 'v', 'num', 'item', 'el', 'cur'],
};

function pick<T>(list: T[], value: number) {
  return list[value % list.length];
}

export function codeFor(sub: Submission, renameFrom?: Submission) {
  const base = renameFrom ?? sub;
  const fn = PROBLEMS[sub.problem].fn;
  const arg = pick(NAMES.arg, base.seed);
  const res = pick(NAMES.res, Math.floor(base.seed / 7));
  const it = pick(NAMES.it, Math.floor((renameFrom ? sub.seed : base.seed) / 13));
  const variant = base.seed % 2;
  const lang = LANGUAGES[sub.language].name;

  if (lang === 'Python') {
    return variant === 0
      ? `import sys\n\ndef ${fn}(${arg}):\n    ${res} = []\n    for ${it} in ${arg}:\n        if ${it} not in ${res}:\n            ${res}.append(${it})\n    ${res}.sort()\n    return ${res}\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    ${arg} = list(map(int, data[1:n + 1]))\n    print(*${fn}(${arg}))\n\nif __name__ == "__main__":\n    main()`
      : `def ${fn}(${arg}):\n    ${res} = {}\n    for i, ${it} in enumerate(${arg}):\n        ${res}[${it}] = i\n    return sorted(${res}.keys())\n\nn = int(input())\n${arg} = list(map(int, input().split()))\nprint(" ".join(map(str, ${fn}(${arg}))))`;
  }
  if (lang === 'Java') {
    return `import java.util.*;\n\npublic class Main {\n    static List<Integer> ${fn}(int[] ${arg}) {\n        List<Integer> ${res} = new ArrayList<>();\n        for (int ${it} : ${arg}) {\n            if (!${res}.contains(${it})) {\n                ${res}.add(${it});\n            }\n        }\n        Collections.sort(${res});\n        return ${res};\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] ${arg} = new int[n];\n        for (int i = 0; i < n; i++) ${arg}[i] = sc.nextInt();\n        System.out.println(${fn}(${arg}));\n    }\n}`;
  }
  if (lang === 'C++') {
    return `#include <bits/stdc++.h>\nusing namespace std;\n\nvector<int> ${fn}(vector<int>& ${arg}) {\n    vector<int> ${res};\n    for (int ${it} : ${arg}) {\n        if (find(${res}.begin(), ${res}.end(), ${it}) == ${res}.end()) {\n            ${res}.push_back(${it});\n        }\n    }\n    sort(${res}.begin(), ${res}.end());\n    return ${res};\n}\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> ${arg}(n);\n    for (auto& v : ${arg}) cin >> v;\n    for (int v : ${fn}(${arg})) cout << v << ' ';\n    return 0;\n}`;
  }
  if (lang === 'JavaScript') {
    return `const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\n\nfunction ${fn}(${arg}) {\n  const ${res} = [];\n  for (const ${it} of ${arg}) {\n    if (!${res}.includes(${it})) {\n      ${res}.push(${it});\n    }\n  }\n  return ${res}.sort((a, b) => a - b);\n}\n\nconst ${arg} = lines[1].split(' ').map(Number);\nconsole.log(${fn}(${arg}).join(' '));`;
  }
  return `#include <stdio.h>\n\nint ${fn}(int ${arg}[], int n, int ${res}[]) {\n    int m = 0;\n    for (int i = 0; i < n; i++) {\n        int ${it} = ${arg}[i], seen = 0;\n        for (int j = 0; j < m; j++) if (${res}[j] == ${it}) seen = 1;\n        if (!seen) ${res}[m++] = ${it};\n    }\n    return m;\n}\n\nint main(void) {\n    int n, ${arg}[1000], ${res}[1000];\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) scanf("%d", &${arg}[i]);\n    int m = ${fn}(${arg}, n, ${res});\n    for (int i = 0; i < m; i++) printf("%d ", ${res}[i]);\n    return 0;\n}`;
}

export function testsFor(sub: Submission, verdict: Verdict): TestResult[] {
  const random = rng(sub.seed);
  const passed = verdict === 'ac' ? sub.testsTotal : verdict === 'ce' ? 0 : Math.min(sub.testsPassed, sub.testsTotal - 1);
  return Array.from({ length: sub.testsTotal }, (_, index) => {
    const status: TestResult['status'] = verdict === 'ce' ? 'skipped' : index < passed ? 'pass' : index === passed ? 'fail' : 'skipped';
    const timeMs =
      status === 'skipped' ? 0 : status === 'fail' && verdict === 'tle' ? TIME_LIMIT_MS : Math.max(1, Math.round(sub.runtimeMs * (0.4 + random() * 0.6)));
    const memoryMb = status === 'skipped' ? 0 : status === 'fail' && verdict === 'mle' ? MEMORY_LIMIT_MB : Math.round(sub.memoryMb * (0.7 + random() * 0.3) * 10) / 10;
    return { index: index + 1, sample: index < 2, status, timeMs, memoryMb };
  });
}

export function rejudgeVerdict(sub: Submission): Verdict {
  return sub.trueVerdict;
}