import type { ExecKind, Execution, MinuteBucket, Outcome } from './types';

interface LangDef {
  name: string;
  weight: number;
  baseMs: number;
  memMb: number;
  compiled: boolean;
  timeLimitMs: number;
  memoryLimitMb: number;
  file: string;
}

export const LANGUAGES: LangDef[] = [
  { name: 'Python', weight: 30, baseMs: 120, memMb: 18, compiled: false, timeLimitMs: 2000, memoryLimitMb: 256, file: 'main.py' },
  { name: 'Java', weight: 22, baseMs: 230, memMb: 64, compiled: true, timeLimitMs: 3000, memoryLimitMb: 512, file: 'Main.java' },
  { name: 'C', weight: 13, baseMs: 30, memMb: 3, compiled: true, timeLimitMs: 1000, memoryLimitMb: 128, file: 'main.c' },
  { name: 'C++', weight: 12, baseMs: 35, memMb: 4, compiled: true, timeLimitMs: 1000, memoryLimitMb: 256, file: 'main.cpp' },
  { name: 'JavaScript', weight: 15, baseMs: 90, memMb: 40, compiled: false, timeLimitMs: 2000, memoryLimitMb: 256, file: 'main.js' },
  { name: 'SQL', weight: 8, baseMs: 60, memMb: 12, compiled: false, timeLimitMs: 2000, memoryLimitMb: 128, file: 'query.sql' },
];

const PROBLEMS: Record<string, string[]> = {
  Python: ['Reverse a String', 'Palindrome Check', 'Word Frequency', 'Matrix Spiral'],
  Java: ['Merge Intervals', 'Second Largest Element', 'Fibonacci (Recursive)', 'LRU Cache'],
  C: ['Largest of Three', 'Balanced Brackets', 'Bit Counting'],
  'C++': ['Dijkstra Shortest Path', 'Binary Search', 'Kth Smallest'],
  JavaScript: ['Two Sum', 'Debounce Function', 'Flatten Array'],
  SQL: ['Top Customers by Revenue', 'Monthly Active Users', 'Duplicate Emails'],
};

export const WORKERS = ['judge-01', 'judge-02', 'judge-03'];

const MIN = 60_000;
const HISTORY_MIN = 2 * 24 * 60;
const RECENT_LIMIT = 500;
const RECENT_WINDOW = 20 * MIN;

export interface Incidents {
  latency: [number, number];
  dip: [number, number];
  degradedFrom: number;
}

export function makeIncidents(origin: number): Incidents {
  return {
    latency: [origin - 190 * MIN, origin - 178 * MIN],
    dip: [origin - 9 * 60 * MIN, origin - 8 * 60 * MIN - 40 * MIN],
    degradedFrom: origin - 25 * MIN,
  };
}

const within = (t: number, [from, to]: [number, number]) => t >= from && t < to;

function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickLanguage() {
  const total = LANGUAGES.reduce((sum, lang) => sum + lang.weight, 0);
  let roll = Math.random() * total;
  for (const lang of LANGUAGES) {
    roll -= lang.weight;
    if (roll <= 0) return lang;
  }
  return LANGUAGES[0];
}

export function ratePerMinute(t: number, incidents: Incidents) {
  const hour = new Date(t).getHours() + new Date(t).getMinutes() / 60;
  const base = Math.max(6, 22 + 12 * Math.sin((2 * Math.PI * (hour - 10)) / 24));
  return within(t, incidents.dip) ? base * 0.15 : base;
}

function pickOutcome(lang: LangDef, worker: string, t: number, incidents: Incidents): Outcome {
  const slow = within(t, incidents.latency);
  const degraded = worker === 'judge-02' && t >= incidents.degradedFrom;
  const table: [Outcome, number][] = [
    ['sandbox', degraded ? 0.3 : 0.01],
    ['tle', slow ? 0.25 : 0.055],
    ['mle', 0.02],
    ['re', 0.065],
    ['ce', lang.compiled ? 0.05 : 0],
    ['wrong', 0.2],
  ];
  let roll = Math.random();
  for (const [outcome, p] of table) {
    if (roll < p) return outcome;
    roll -= p;
  }
  return 'ok';
}

function sampleCore(t: number, incidents: Incidents) {
  const lang = pickLanguage();
  const worker = WORKERS[Math.floor(Math.random() * WORKERS.length)];
  const outcome = pickOutcome(lang, worker, t, incidents);
  const slow = within(t, incidents.latency) ? 3.5 : 1;
  let durationMs: number;
  if (outcome === 'sandbox') durationMs = 4000 + Math.random() * 4000;
  else if (outcome === 'tle') durationMs = lang.timeLimitMs + Math.random() * 120;
  else if (outcome === 'ce') durationMs = lang.baseMs * (1.5 + Math.random());
  else durationMs = Math.min(lang.baseMs * Math.exp(gauss() * 0.6) * slow, lang.timeLimitMs);
  durationMs = Math.round(durationMs);
  return { lang, worker, outcome, durationMs };
}

let counter = Math.floor(Math.random() * 46656) * 1296;

const OUTPUT: Record<Outcome, (lang: LangDef) => { stdout: string; stderr: string }> = {
  ok: () => ({ stdout: '5\n3 1 4 1 5\n', stderr: '' }),
  wrong: () => ({ stdout: '5\n3 1 4 1 6\n', stderr: '' }),
  tle: () => ({ stdout: '', stderr: 'Killed: exceeded CPU time limit' }),
  mle: (lang) => ({ stdout: '', stderr: lang.name === 'Java' ? 'java.lang.OutOfMemoryError: Java heap space' : 'Killed: exceeded memory limit (cgroup OOM)' }),
  re: (lang) => ({
    stdout: '',
    stderr:
      lang.name === 'Python'
        ? `Traceback (most recent call last):\n  File "${lang.file}", line 14, in <module>\n    print(nums[n])\nIndexError: list index out of range`
        : lang.name === 'Java'
          ? 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 5\n\tat Main.main(Main.java:21)'
          : lang.name === 'JavaScript'
            ? `TypeError: Cannot read properties of undefined (reading 'length')\n    at solve (${lang.file}:9:18)`
            : lang.name === 'SQL'
              ? 'ERROR: division by zero'
              : 'Segmentation fault (core dumped)',
  }),
  ce: (lang) => ({
    stdout: '',
    stderr:
      lang.name === 'Java'
        ? `${lang.file}:12: error: ';' expected\n        int total = 0\n                     ^\n1 error`
        : `${lang.file}: In function 'main':\n${lang.file}:8:5: error: expected ';' before 'return'`,
  }),
  sandbox: () => ({ stdout: '', stderr: 'sandbox: failed to start container: context deadline exceeded (image elab/runner pull timeout)' }),
};

function exitCodeFor(outcome: Outcome, lang: LangDef) {
  if (outcome === 'ok' || outcome === 'wrong') return 0;
  if (outcome === 'tle' || outcome === 'mle') return 137;
  if (outcome === 're') return lang.name === 'C' || lang.name === 'C++' ? 139 : 1;
  if (outcome === 'ce') return 1;
  return null;
}

function buildExecution(t: number, core: ReturnType<typeof sampleCore>): Execution {
  const { lang, worker, outcome, durationMs } = core;
  counter += 1;
  const kind: ExecKind = Math.random() < 0.35 ? 'submit' : 'run';
  const testsTotal = kind === 'submit' ? 8 + Math.floor(Math.random() * 8) : 1 + Math.floor(Math.random() * 3);
  const testsPassed =
    outcome === 'ok'
      ? testsTotal
      : outcome === 'ce' || outcome === 'sandbox'
        ? 0
        : Math.floor(Math.random() * testsTotal);
  let memoryMb = Math.round(lang.memMb * Math.exp(gauss() * 0.3) * 10) / 10;
  if (outcome === 'mle') memoryMb = lang.memoryLimitMb;
  if (outcome === 'ce' || outcome === 'sandbox') memoryMb = 0;
  const problems = PROBLEMS[lang.name];
  return {
    id: `E-${counter.toString(36).toUpperCase().padStart(6, '0')}`,
    kind,
    problem: problems[Math.floor(Math.random() * problems.length)],
    language: lang.name,
    learner: `L-${1000 + Math.floor(Math.random() * 900)}`,
    worker,
    startedAt: t,
    durationMs,
    memoryMb,
    timeLimitMs: lang.timeLimitMs,
    memoryLimitMb: lang.memoryLimitMb,
    exitCode: exitCodeFor(outcome, lang),
    outcome,
    testsPassed,
    testsTotal,
    ...OUTPUT[outcome](lang),
  };
}

export function emptyBucket(t: number): MinuteBucket {
  return {
    t,
    count: 0,
    outcomes: { ok: 0, wrong: 0, tle: 0, mle: 0, re: 0, ce: 0, sandbox: 0 },
    durations: [],
    languages: {},
  };
}

export interface MonitorStore {
  minutes: MinuteBucket[];
  recent: Execution[];
  lastTick: number;
  incidents: Incidents;
  epoch: number;
}

function record(store: MonitorStore, t: number, now: number) {
  const core = sampleCore(t, store.incidents);
  const minute = Math.floor(t / MIN) * MIN;
  let bucket = store.minutes[store.minutes.length - 1];
  if (!bucket || bucket.t !== minute) {
    bucket = emptyBucket(minute);
    store.minutes.push(bucket);
  }
  bucket.count += 1;
  bucket.outcomes[core.outcome] += 1;
  const timed = core.outcome === 'ok' || core.outcome === 'wrong' || core.outcome === 're' || core.outcome === 'mle';
  if (timed) bucket.durations.push(core.durationMs);
  const stat = (bucket.languages[core.lang.name] ??= { count: 0, failures: 0, timed: 0, durationSum: 0 });
  stat.count += 1;
  if (timed) {
    stat.timed += 1;
    stat.durationSum += core.durationMs;
  }
  if (core.outcome === 'tle' || core.outcome === 'mle' || core.outcome === 're' || core.outcome === 'sandbox') stat.failures += 1;
  if (t >= now - RECENT_WINDOW) store.recent.push(buildExecution(t, core));
}

function fill(store: MonitorStore, from: number, to: number, now: number) {
  let cursor = from;
  while (cursor < to) {
    const minuteEnd = Math.min(to, Math.floor(cursor / MIN) * MIN + MIN);
    const span = minuteEnd - cursor;
    const expected = (ratePerMinute(cursor, store.incidents) * span) / MIN;
    const count = Math.max(0, Math.round(expected + gauss() * Math.sqrt(expected) * 0.8));
    const times = Array.from({ length: count }, () => cursor + Math.random() * span).sort((a, b) => a - b);
    for (const t of times) record(store, t, now);
    if (count === 0 && minuteEnd - (Math.floor(cursor / MIN) * MIN) === MIN) {
      const minute = Math.floor(cursor / MIN) * MIN;
      if (store.minutes[store.minutes.length - 1]?.t !== minute) store.minutes.push(emptyBucket(minute));
    }
    cursor = minuteEnd;
  }
}

export function createStore(now: number): MonitorStore {
  const start = Math.floor(now / MIN) * MIN - HISTORY_MIN * MIN;
  const store: MonitorStore = { minutes: [], recent: [], lastTick: now, incidents: makeIncidents(now), epoch: now };
  fill(store, start, now, now);
  store.recent = store.recent.slice(-RECENT_LIMIT);
  return store;
}

export function advanceStore(store: MonitorStore, now: number) {
  if (now <= store.lastTick) return false;
  fill(store, store.lastTick, now, now);
  store.lastTick = now;
  const cutoff = Math.floor(now / MIN) * MIN - HISTORY_MIN * MIN;
  while (store.minutes.length && store.minutes[0].t < cutoff) store.minutes.shift();
  if (store.recent.length > RECENT_LIMIT) store.recent = store.recent.slice(-RECENT_LIMIT);
  return true;
}