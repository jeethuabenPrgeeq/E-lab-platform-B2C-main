import type { AuditCategory, AuditChange, AuditEvent } from './types';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADMINS: AuditEvent['actor'][] = [
  { name: 'Ravi K', role: 'Platform admin' },
  { name: 'Meera S', role: 'Platform admin' },
  { name: 'Arjun P', role: 'Platform admin' },
  { name: 'You', role: 'Platform admin' },
  { name: 'Lakshmi V', role: 'Super admin' },
];
const SYSTEM: AuditEvent['actor'] = { name: 'System', role: 'System' };

const IPS = ['10.20.4.17', '10.20.4.22', '49.37.142.8', '103.21.58.110', '10.20.4.31'];
const AGENTS = [
  'Chrome 129 · Windows 11',
  'Edge 129 · Windows 11',
  'Firefox 131 · Ubuntu 24.04',
  'Safari 18 · macOS 15',
];

const PROBLEMS = ['Merge Intervals', 'Two Sum', 'LRU Cache', 'Balanced Brackets', 'Matrix Spiral', 'Kth Smallest', 'Dijkstra Shortest Path', 'Reverse a String'];
const IMAGES = ['elab/python:3.12', 'elab/java:21', 'elab/gcc:13', 'elab/node:20', 'elab/runner:1.4.2'];
const WORKERS = ['judge-01', 'judge-02', 'judge-03', 'judge-04'];
const LANGS = ['Python', 'Java', 'C++', 'JavaScript', 'C'];

interface Template {
  category: AuditCategory;
  weight: number;
  sensitive?: boolean;
  system?: boolean;
  failRate?: number;
  build: (r: () => number) => { action: string; summary: string; target: AuditEvent['target']; changes: AuditChange[]; error?: string };
}

const pick = <T,>(list: T[], r: () => number) => list[Math.floor(r() * list.length)];

const TEMPLATES: Template[] = [
  {
    category: 'content',
    weight: 14,
    build: (r) => {
      const problem = pick(PROBLEMS, r);
      return { action: 'problem.updated', summary: `Edited the statement of ${problem}`, target: { type: 'problem', id: `P-${100 + Math.floor(r() * 300)}`, label: problem }, changes: [{ field: 'statement', before: '…258 words', after: `…${240 + Math.floor(r() * 60)} words` }] };
    },
  },
  {
    category: 'content',
    weight: 8,
    build: (r) => {
      const problem = pick(PROBLEMS, r);
      return { action: 'problem.published', summary: `Published ${problem}`, target: { type: 'problem', id: `P-${100 + Math.floor(r() * 300)}`, label: problem }, changes: [{ field: 'status', before: 'Ready', after: 'Published' }] };
    },
  },
  {
    category: 'content',
    weight: 12,
    failRate: 0.04,
    build: (r) => {
      const problem = pick(PROBLEMS, r);
      const n = 1 + Math.floor(r() * 18);
      return { action: 'testcase.updated', summary: `Changed hidden test ${n} of ${problem}`, target: { type: 'test_case', id: `TC-${problem.slice(0, 3).toUpperCase()}-${n}`, label: `${problem} · test ${n}` }, changes: [{ field: 'expected_output', before: '[[1,4],[4,5]]', after: '[[1,5]]' }], error: 'Validation failed: expected output is empty' };
    },
  },
  {
    category: 'content',
    weight: 5,
    sensitive: true,
    build: (r) => {
      const problem = pick(PROBLEMS, r);
      return { action: 'problem.deleted', summary: `Deleted draft problem ${problem} (copy)`, target: { type: 'problem', id: `P-${400 + Math.floor(r() * 90)}`, label: `${problem} (copy)` }, changes: [{ field: 'deleted', before: 'false', after: 'true' }] };
    },
  },
  {
    category: 'runtime',
    weight: 6,
    failRate: 0.12,
    build: (r) => {
      const image = pick(IMAGES, r);
      return { action: 'runtime.image.pulled', summary: `Pulled image ${image} to all judge hosts`, target: { type: 'docker_image', id: image, label: image }, changes: [{ field: 'status', before: 'Pulling', after: 'Ready' }], error: 'Pull timed out on judge-02: context deadline exceeded' };
    },
  },
  {
    category: 'runtime',
    weight: 5,
    build: (r) => {
      const lang = pick(LANGS, r);
      const before = 1000 + Math.floor(r() * 4) * 500;
      return { action: 'runtime.language.updated', summary: `Changed the time limit for ${lang}`, target: { type: 'language', id: lang.toLowerCase(), label: lang }, changes: [{ field: 'time_limit_ms', before: String(before), after: String(before + 500) }] };
    },
  },
  {
    category: 'judge',
    weight: 6,
    build: (r) => {
      const worker = pick(WORKERS, r);
      const drain = r() < 0.5;
      return { action: drain ? 'judge.worker.drained' : 'judge.worker.resumed', summary: `${drain ? 'Drained' : 'Resumed'} ${worker}`, target: { type: 'worker', id: worker, label: worker }, changes: [{ field: 'status', before: drain ? 'online' : 'draining', after: drain ? 'draining' : 'online' }] };
    },
  },
  {
    category: 'judge',
    weight: 3,
    sensitive: true,
    build: (r) => {
      const before = [256, 512][Math.floor(r() * 2)];
      return { action: 'judge.limits.updated', summary: 'Changed platform execution limits', target: { type: 'settings', id: 'judge-limits', label: 'Judge limits' }, changes: [{ field: 'memory_limit_mb', before: String(before), after: String(before === 256 ? 512 : 256) }, { field: 'network_access', before: 'false', after: 'false' }] };
    },
  },
  {
    category: 'judge',
    weight: 3,
    sensitive: true,
    build: (r) => {
      const problem = pick(PROBLEMS, r);
      const total = 40 + Math.floor(r() * 300);
      return { action: 'submissions.rejudged', summary: `Rejudged ${total} submissions of ${problem}`, target: { type: 'problem', id: `P-${100 + Math.floor(r() * 300)}`, label: problem }, changes: [{ field: 'verdicts_changed', before: '0', after: String(Math.floor(total * r() * 0.5)) }] };
    },
  },
  {
    category: 'monitoring',
    weight: 4,
    build: (r) => ({ action: 'alert.acknowledged', summary: `Acknowledged alert “${pick(['Sandbox errors', 'Slow executions', 'Time-limit spike'], r)}”`, target: { type: 'alert', id: 'sandbox-errors', label: 'Execution alert' }, changes: [{ field: 'state', before: 'Firing', after: 'Acknowledged' }] }),
  },
  {
    category: 'support',
    weight: 9,
    build: (r) => {
      const id = `TS-${2190 + Math.floor(r() * 20)}`;
      return { action: 'ticket.replied', summary: `Replied to ticket ${id}`, target: { type: 'ticket', id, label: id }, changes: [{ field: 'status', before: 'New', after: 'Open' }] };
    },
  },
  {
    category: 'support',
    weight: 5,
    build: (r) => {
      const id = `PR-${1030 + Math.floor(r() * 20)}`;
      return { action: 'problem_report.resolved', summary: `Resolved problem report ${id}`, target: { type: 'problem_report', id, label: id }, changes: [{ field: 'status', before: 'In review', after: 'Resolved' }] };
    },
  },
  {
    category: 'release',
    weight: 2,
    sensitive: true,
    build: (r) => {
      const version = `2026.09.${1 + Math.floor(r() * 4)}`;
      return { action: 'release.rollout.started', summary: `Started rollout of ${version}`, target: { type: 'release', id: version, label: version }, changes: [{ field: 'rollout_percent', before: '0', after: '5' }] };
    },
  },
  {
    category: 'auth',
    weight: 16,
    build: () => ({ action: 'auth.login.succeeded', summary: 'Signed in to the admin console', target: { type: 'session', id: 'web', label: 'Admin console' }, changes: [] }),
  },
  {
    category: 'auth',
    weight: 4,
    failRate: 1,
    sensitive: true,
    build: () => ({ action: 'auth.login.failed', summary: 'Failed sign-in attempt', target: { type: 'session', id: 'web', label: 'Admin console' }, changes: [], error: 'Invalid email or password' }),
  },
  {
    category: 'auth',
    weight: 2,
    sensitive: true,
    build: (r) => ({ action: 'auth.role.changed', summary: `Changed admin role for ${pick(['Meera S', 'Arjun P'], r)}`, target: { type: 'user', id: `U-${20 + Math.floor(r() * 10)}`, label: 'Admin account' }, changes: [{ field: 'role', before: 'Content admin', after: 'Platform admin' }] }),
  },
];

function hex(r: () => number, length: number) {
  return Array.from({ length }, () => Math.floor(r() * 16).toString(16)).join('');
}

function make(id: number, at: number, r: () => number, template: Template, actor?: AuditEvent['actor']): AuditEvent {
  const built = template.build(r);
  const fail = r() < (template.failRate ?? 0.015);
  const who = actor ?? (template.system ? SYSTEM : pick(ADMINS, r));
  const failedLogin = built.action === 'auth.login.failed';
  return {
    id: `AL-${(id + 48000).toString(36).toUpperCase()}`,
    at,
    actor: who,
    category: template.category,
    action: built.action,
    summary: built.summary,
    target: built.target,
    result: fail ? 'failure' : 'success',
    error: fail ? built.error ?? 'Request failed: 409 conflict with a newer change' : null,
    sensitive: Boolean(template.sensitive),
    ip: failedLogin && r() < 0.6 ? '185.220.101.44' : pick(IPS, r),
    userAgent: failedLogin && r() < 0.6 ? 'python-requests/2.32' : pick(AGENTS, r),
    requestId: `req_${hex(r, 12)}`,
    changes: fail ? [] : built.changes,
  };
}

export function generateAudit(now: number): AuditEvent[] {
  const events: AuditEvent[] = [];
  const total = TEMPLATES.reduce((sum, template) => sum + template.weight, 0);
  const startDay = Math.floor(now / DAY) - 30;
  for (let day = startDay; day <= Math.floor(now / DAY); day += 1) {
    const r = rng(day * 7919);
    const count = 16 + Math.floor(r() * 18);
    for (let i = 0; i < count; i += 1) {
      const at = day * DAY + Math.floor(r() * DAY);
      let roll = r() * total;
      let template = TEMPLATES[0];
      for (const item of TEMPLATES) {
        roll -= item.weight;
        if (roll <= 0) {
          template = item;
          break;
        }
      }
      const event = make(day * 100 + i, at, r, template);
      if (at <= now) events.push(event);
    }
  }

  const fixed: [number, AuditEvent['actor'], AuditCategory, string, string, AuditEvent['target'], AuditChange[], boolean][] = [
    [24 * MIN, ADMINS[0], 'monitoring', 'incident.declared', 'Declared SEV2 incident INC-311 “judge-02 failing to start sandboxes”', { type: 'incident', id: 'INC-311', label: 'INC-311' }, [{ field: 'status', before: '—', after: 'Investigating' }], true],
    [10 * MIN, ADMINS[0], 'judge', 'judge.worker.drained', 'Drained judge-02', { type: 'worker', id: 'judge-02', label: 'judge-02' }, [{ field: 'status', before: 'online', after: 'draining' }], false],
    [40 * MIN, ADMINS[2], 'release', 'release.rollout.started', 'Started rollout of 2026.10.2', { type: 'release', id: '2026.10.2', label: '2026.10.2' }, [{ field: 'rollout_percent', before: '0', after: '5' }], true],
    [3 * HOUR + 10 * MIN, ADMINS[1], 'monitoring', 'incident.resolved', 'Resolved incident INC-309 “Slow executions across all languages”', { type: 'incident', id: 'INC-309', label: 'INC-309' }, [{ field: 'status', before: 'Identified', after: 'Resolved' }], false],
  ];
  fixed.forEach(([ago, actor, category, action, summary, target, changes, sensitive], index) => {
    const r = rng(index + 99);
    events.push({
      id: `AL-F${index}`,
      at: now - ago,
      actor,
      category,
      action,
      summary,
      target,
      result: 'success',
      error: null,
      sensitive,
      ip: pick(IPS, r),
      userAgent: pick(AGENTS, r),
      requestId: `req_${hex(r, 12)}`,
      changes,
    });
  });

  const burst = rng(4242);
  for (let i = 0; i < 6; i += 1) {
    events.push({
      id: `AL-B${i}`,
      at: now - 2 * HOUR - i * 40_000,
      actor: { name: 'unknown (ravi.k@elab.com)', role: 'Platform admin' },
      category: 'auth',
      action: 'auth.login.failed',
      summary: 'Failed sign-in attempt',
      target: { type: 'session', id: 'web', label: 'Admin console' },
      result: 'failure',
      error: 'Invalid email or password',
      sensitive: true,
      ip: '185.220.101.44',
      userAgent: 'python-requests/2.32',
      requestId: `req_${hex(burst, 12)}`,
      changes: [],
    });
  }

  return events.sort((a, b) => b.at - a.at);
}