'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AuditActor, AuditCategory, AuditChange, AuditEvent, AuditInput, AuditSeverity } from './types';

const KEY = 'elab_super_audit_v1';
const CHANGE_EVENT = 'elab-audit';
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const FIRST_ID = 100_000;

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

interface Origin {
  ip: string;
  location: string;
  device: string;
}

type ActorKey = 'you' | 'lakshmi' | 'arvind' | 'sneha' | 'rohan' | 'system';

const ACTORS: Record<ActorKey, AuditActor & Origin> = {
  you: { name: 'You', email: 'superadmin@elab.com', role: 'Super admin', ip: '49.207.48.12', location: 'Bengaluru, IN', device: 'Chrome on Windows' },
  lakshmi: { name: 'Lakshmi V', email: 'lakshmi.v@elab.com', role: 'Super admin', ip: '103.88.226.40', location: 'Kochi, IN', device: 'Safari on macOS' },
  arvind: { name: 'Arvind Menon', email: 'arvind.menon@elab.com', role: 'Platform admin', ip: '117.193.65.9', location: 'Bengaluru, IN', device: 'Edge on Windows' },
  sneha: { name: 'Sneha Varghese', email: 'sneha.v@elab.com', role: 'Support agent', ip: '49.37.152.71', location: 'Thiruvananthapuram, IN', device: 'Chrome on Windows' },
  rohan: { name: 'Rohan Das', email: 'rohan.das@elab.com', role: 'Support agent', ip: '106.51.20.33', location: 'Bengaluru, IN', device: 'Chrome on Android' },
  system: { name: 'System', email: '—', role: 'System', ip: '—', location: 'eLab servers', device: 'Automated job' },
};

export const ACTOR_NAMES = (Object.keys(ACTORS) as ActorKey[]).map((key) => ACTORS[key].name);

const STRANGERS: Origin[] = [
  { ip: '185.220.101.4', location: 'Frankfurt, DE', device: 'Python script' },
  { ip: '45.155.205.88', location: 'Amsterdam, NL', device: 'curl' },
  { ip: '102.89.34.17', location: 'Lagos, NG', device: 'Firefox on Linux' },
];

const LEARNERS = ['Aarav Nair', 'Diya Menon', 'Rahul Iyer', 'Ananya Rao', 'Karthik Hegde', 'Meghana Reddy', 'Arjun George', 'Fathima Rasheed', 'Nikhil Joseph', 'Sneha Pillai', 'Kavya Krishnan', 'Ishaan Das', 'Riya Thomas', 'Tanvi Bhat', 'Anjali Krishnan', 'Gautham Kumar'];
const PROBLEMS = ['Two Sum Variants', 'Docker Networking Lab', 'LRU Cache Design', 'SQL Window Functions', 'Kubernetes Rollouts', 'Binary Tree Zigzag', 'REST Rate Limiter', 'Graph Shortest Paths'];
const PATHS = ['DevOps Essentials', 'Java Backend Developer', 'Data Structures in Python', 'Full-Stack JavaScript'];
const PLANS = ['Starter', 'Professional', 'Premium'];
const INSTITUTIONS = ['Christ University', 'NIT Calicut', 'PES University', 'RV College of Engineering'];

type Draft = {
  actor: ActorKey | Origin & AuditActor;
  action: string;
  summary: string;
  category: AuditCategory;
  severity: AuditSeverity;
  target: AuditEvent['target'];
  changes?: AuditChange[];
  reason?: string;
  outcome?: 'success' | 'failure';
};

type Template = { weight: number; build: (r: () => number) => Draft };

const pick = <T,>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length)];
const emailOf = (name: string) => `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@gmail.com`;
const userId = (r: () => number) => `USR-${2000 + Math.floor(r() * 7000)}`;

const TEMPLATES: Template[] = [
  {
    weight: 14,
    build: (r) => {
      const who = pick(r, ['you', 'lakshmi', 'arvind', 'sneha', 'rohan'] as const);
      return { actor: who, action: 'auth.sign_in', summary: 'Signed in to the admin console', category: 'auth', severity: 'info', target: { type: 'Session', id: `SES-${Math.floor(r() * 90000) + 10000}`, label: 'Admin console' } };
    },
  },
  {
    weight: 4,
    build: (r) => {
      const origin = pick(r, STRANGERS);
      const tried = pick(r, ['admin@elab.com', 'lakshmi.v@elab.com', 'root@elab.com', 'superadmin@elab.com']);
      return { actor: { ...origin, name: 'Unknown', email: tried, role: 'Unknown' }, action: 'auth.sign_in_failed', summary: `Failed sign-in as ${tried}`, category: 'auth', severity: 'notice', target: { type: 'Account', id: tried, label: tried }, reason: pick(r, ['Wrong password', 'Wrong password', 'Two-factor code rejected', 'Account does not exist']), outcome: 'failure' };
    },
  },
  {
    weight: 2,
    build: (r) => {
      const who = pick(r, ['lakshmi', 'arvind', 'sneha', 'rohan'] as const);
      return { actor: who, action: 'auth.mfa_enabled', summary: 'Turned on two-factor sign-in', category: 'auth', severity: 'info', target: { type: 'Admin', id: ACTORS[who].email, label: ACTORS[who].name } };
    },
  },
  {
    weight: 1,
    build: (r) => {
      const name = pick(r, ['CI pipeline', 'Analytics export', 'HackerEarth sync']);
      const revoke = r() < 0.4;
      return { actor: pick(r, ['lakshmi', 'you'] as const), action: revoke ? 'auth.api_key_revoked' : 'auth.api_key_created', summary: `${revoke ? 'Revoked' : 'Created'} the API key “${name}”`, category: 'auth', severity: 'critical', target: { type: 'API key', id: `key_${Math.floor(r() * 9e5 + 1e5)}`, label: name } };
    },
  },
  {
    weight: 4,
    build: (r) => {
      const name = pick(r, LEARNERS);
      return { actor: pick(r, ['you', 'lakshmi', 'sneha'] as const), action: 'user.suspended', summary: `Suspended ${name}`, category: 'users', severity: 'notice', target: { type: 'User', id: userId(r), label: name }, changes: [{ field: 'Status', before: 'Active', after: 'Suspended' }], reason: pick(r, ['Shared account credentials', 'Plagiarism in a contest', 'Chargeback on last payment', 'Abusive messages in discussions']) };
    },
  },
  {
    weight: 2,
    build: (r) => {
      const name = pick(r, LEARNERS);
      return { actor: pick(r, ['you', 'lakshmi'] as const), action: 'user.reactivated', summary: `Reactivated ${name}`, category: 'users', severity: 'info', target: { type: 'User', id: userId(r), label: name }, changes: [{ field: 'Status', before: 'Suspended', after: 'Active' }] };
    },
  },
  {
    weight: 4,
    build: (r) => {
      const name = pick(r, LEARNERS);
      const from = Math.floor(r() * 2);
      return { actor: pick(r, ['sneha', 'rohan', 'you'] as const), action: 'user.plan_changed', summary: `Changed ${name}’s plan`, category: 'users', severity: 'info', target: { type: 'User', id: userId(r), label: name }, changes: [{ field: 'Plan', before: PLANS[from], after: PLANS[from + 1] }] };
    },
  },
  {
    weight: 3,
    build: (r) => {
      const name = pick(r, LEARNERS);
      return { actor: pick(r, ['you', 'lakshmi'] as const), action: 'user.invited', summary: `Invited ${emailOf(name)} as Instructor`, category: 'users', severity: 'info', target: { type: 'User', id: userId(r), label: name } };
    },
  },
  {
    weight: 3,
    build: (r) => {
      const name = pick(r, LEARNERS);
      return { actor: pick(r, ['sneha', 'rohan'] as const), action: 'user.password_reset', summary: `Sent a password reset link to ${name}`, category: 'users', severity: 'info', target: { type: 'User', id: userId(r), label: name } };
    },
  },
  {
    weight: 1,
    build: (r) => ({ actor: pick(r, ['you', 'lakshmi'] as const), action: 'user.exported', summary: 'Exported the user list to CSV', category: 'users', severity: 'notice', target: { type: 'Export', id: `EXP-${Math.floor(r() * 900) + 100}`, label: `${(17000 + Math.floor(r() * 1400)).toLocaleString('en-IN')} users` } }),
  },
  {
    weight: 2,
    build: (r) => {
      const name = pick(r, ['Priya Shah', 'Vivek Rao', 'Neha Kulkarni']);
      return { actor: pick(r, ['you', 'lakshmi'] as const), action: 'admin.invited', summary: `Invited ${name} as Support agent`, category: 'access', severity: 'notice', target: { type: 'Admin', id: emailOf(name).replace('gmail.com', 'elab.com'), label: name } };
    },
  },
  {
    weight: 1,
    build: (r) => ({ actor: 'lakshmi', action: 'role.permissions_updated', summary: 'Updated permissions for the Support agent role', category: 'access', severity: 'critical', target: { type: 'Role', id: 'support_agent', label: 'Support agent' }, changes: [pick(r, [{ field: 'Issue refunds', before: 'Off', after: 'On' }, { field: 'Export users', before: 'On', after: 'Off' }, { field: 'Change plans', before: 'Off', after: 'On' }])] }),
  },
  {
    weight: 1,
    build: () => ({ actor: 'lakshmi', action: 'admin.mfa_reset', summary: 'Reset two-factor for Rohan Das', category: 'access', severity: 'critical', target: { type: 'Admin', id: 'rohan.das@elab.com', label: 'Rohan Das' }, reason: 'Lost phone' }),
  },
  {
    weight: 4,
    build: (r) => {
      const problem = pick(r, PROBLEMS);
      return { actor: pick(r, ['arvind', 'you', 'lakshmi'] as const), action: 'content.tier_changed', summary: `Moved “${problem}” to Premium`, category: 'content', severity: 'info', target: { type: 'Problem', id: `PRB-${Math.floor(r() * 900) + 100}`, label: problem }, changes: [{ field: 'Tier', before: 'Free', after: 'Premium' }] };
    },
  },
  {
    weight: 3,
    build: (r) => {
      const problem = pick(r, PROBLEMS);
      return { actor: pick(r, ['arvind', 'you'] as const), action: 'content.hidden', summary: `Hid “${problem}” from the catalog`, category: 'content', severity: 'info', target: { type: 'Problem', id: `PRB-${Math.floor(r() * 900) + 100}`, label: problem }, changes: [{ field: 'Visibility', before: 'Visible', after: 'Hidden' }], reason: pick(r, ['Broken test cases', 'Duplicate of another problem', 'Being rewritten']) };
    },
  },
  {
    weight: 2,
    build: (r) => {
      const path = pick(r, PATHS);
      return { actor: pick(r, ['you', 'arvind'] as const), action: 'path.published', summary: `Published learning path “${path}”`, category: 'content', severity: 'info', target: { type: 'Learning path', id: `LP-${Math.floor(r() * 90) + 10}`, label: path }, changes: [{ field: 'Status', before: 'Draft', after: 'Published' }] };
    },
  },
  {
    weight: 2,
    build: (r) => {
      const name = pick(r, ['Weekly Sprint #42', 'Campus Code-Off', 'SQL Speedrun', 'Long Challenge']);
      return { actor: pick(r, ['you', 'arvind'] as const), action: 'challenge.created', summary: `Created challenge “${name}”`, category: 'content', severity: 'info', target: { type: 'Challenge', id: `CH-${Math.floor(r() * 900) + 100}`, label: name } };
    },
  },
  {
    weight: 4,
    build: (r) => {
      const amount = pick(r, [499, 999, 1499, 4999]);
      const name = pick(r, LEARNERS);
      return { actor: pick(r, ['sneha', 'you', 'lakshmi'] as const), action: 'refund.issued', summary: `Refunded ₹${amount.toLocaleString('en-IN')} to ${name}`, category: 'billing', severity: 'notice', target: { type: 'Invoice', id: `INV-${Math.floor(r() * 90000) + 10000}`, label: name }, reason: pick(r, ['Charged twice', 'Cancelled within 7 days', 'Renewal after cancellation', 'Service outage credit']) };
    },
  },
  {
    weight: 3,
    build: (r) => {
      const id = `SUB-${11000 + Math.floor(r() * 400)}`;
      const now = r() < 0.5;
      return { actor: pick(r, ['sneha', 'you'] as const), action: 'subscription.cancelled', summary: `Cancelled ${id} ${now ? 'immediately' : 'at period end'}`, category: 'billing', severity: 'notice', target: { type: 'Subscription', id, label: pick(r, LEARNERS) }, reason: pick(r, ['Customer request', 'Switching to institution plan', 'Payment failed 3 times']) };
    },
  },
  {
    weight: 5,
    build: (r) => {
      const id = `SUB-${11000 + Math.floor(r() * 400)}`;
      return { actor: 'system', action: 'payment.failed', summary: `Renewal payment failed for ${id}`, category: 'billing', severity: 'info', target: { type: 'Subscription', id, label: pick(r, LEARNERS) }, reason: pick(r, ['UPI mandate expired', 'Card declined', 'Insufficient funds']), outcome: 'failure' };
    },
  },
  {
    weight: 2,
    build: (r) => {
      const code = pick(r, ['WELCOME50', 'STUDENT15', 'NITC2026', 'DEVOPS40', 'PREMIUM500']);
      const paused = r() < 0.4;
      return { actor: pick(r, ['you', 'lakshmi'] as const), action: paused ? 'coupon.paused' : 'coupon.created', summary: `${paused ? 'Paused' : 'Created'} coupon ${code}`, category: 'billing', severity: 'info', target: { type: 'Coupon', id: code, label: code } };
    },
  },
  {
    weight: 4,
    build: (r) => {
      const ticket = `CS-${4000 + Math.floor(r() * 140)}`;
      const resolved = r() < 0.55;
      return { actor: pick(r, ['sneha', 'rohan'] as const), action: resolved ? 'ticket.resolved' : 'ticket.assigned', summary: resolved ? `Resolved ${ticket}` : `Assigned ${ticket} to ${pick(r, ['Sneha Varghese', 'Rohan Das', 'Asha Kumar'])}`, category: 'support', severity: 'info', target: { type: 'Ticket', id: ticket, label: pick(r, ['Charged twice', 'Certificate name wrong', 'Cannot change plan', 'Invoice GST number']) } };
    },
  },
  {
    weight: 2,
    build: (r) => {
      const name = pick(r, ['Weekly progress digest', 'New problems this week', 'Contest reminder', 'Placement drive alert']);
      const audience = pick(r, [18420, 4305, 11240, 1860]);
      return { actor: pick(r, ['you', 'lakshmi'] as const), action: 'campaign.sent', summary: `Sent “${name}” to ${audience.toLocaleString('en-IN')} people`, category: 'notifications', severity: 'info', target: { type: 'Announcement', id: `NT-${Math.floor(r() * 900) + 100}`, label: name } };
    },
  },
  {
    weight: 1,
    build: (r) => ({ actor: 'you', action: 'automation.toggled', summary: 'Turned off “Streak reminder”', category: 'notifications', severity: 'info', target: { type: 'Automation', id: 'AUTO-streak', label: 'Streak reminder' }, changes: [{ field: 'Status', before: 'On', after: 'Off' }], reason: r() < 0.5 ? 'Too many unsubscribes' : undefined }),
  },
  {
    weight: 1,
    build: (r) => {
      const institution = pick(r, INSTITUTIONS);
      return { actor: 'lakshmi', action: 'settings.updated', summary: 'Updated Sign-up & access settings', category: 'settings', severity: 'notice', target: { type: 'Settings', id: 'signup', label: 'Sign-up & access' }, changes: [{ field: 'Institution email domains', before: '2 domains', after: `3 domains (added ${institution})` }] };
    },
  },
];

const TOTAL_WEIGHT = TEMPLATES.reduce((sum, template) => sum + template.weight, 0);

function chooseTemplate(r: () => number) {
  let roll = r() * TOTAL_WEIGHT;
  for (const template of TEMPLATES) {
    roll -= template.weight;
    if (roll < 0) return template;
  }
  return TEMPLATES[0];
}

type Pinned = Draft & { ago: number };

const PINNED: Pinned[] = [
  { ago: 25 * MIN, actor: 'you', action: 'auth.sign_in', summary: 'Signed in to the admin console', category: 'auth', severity: 'info', target: { type: 'Session', id: 'SES-58213', label: 'Admin console' } },
  ...[38, 40, 41, 43, 44].map<Pinned>((m, index) => ({ ago: m * MIN, actor: { ...STRANGERS[0], name: 'Unknown', email: 'admin@elab.com', role: 'Unknown' }, action: 'auth.sign_in_failed', summary: 'Failed sign-in as admin@elab.com', category: 'auth', severity: 'notice', target: { type: 'Account', id: 'admin@elab.com', label: 'admin@elab.com' }, reason: index === 4 ? 'Account does not exist' : 'Wrong password', outcome: 'failure' })),
  { ago: 37 * MIN, actor: 'system', action: 'auth.ip_blocked', summary: 'Blocked 185.220.101.4 for 15 minutes after 5 failed sign-ins', category: 'auth', severity: 'critical', target: { type: 'IP address', id: '185.220.101.4', label: '185.220.101.4' }, reason: 'Sign-in lockout rule: 5 attempts' },
  ...[3 * 60 + 10, 3 * 60 + 12].map<Pinned>((m) => ({ ago: m * MIN, actor: { ...STRANGERS[1], name: 'Unknown', email: 'superadmin@elab.com', role: 'Unknown' }, action: 'auth.sign_in_failed', summary: 'Failed sign-in as superadmin@elab.com', category: 'auth', severity: 'notice', target: { type: 'Account', id: 'superadmin@elab.com', label: 'superadmin@elab.com' }, reason: 'Two-factor code rejected', outcome: 'failure' })),
  { ago: 2 * HOUR, actor: 'sneha', action: 'refund.issued', summary: 'Refunded ₹1,499 to Anjali Krishnan', category: 'billing', severity: 'notice', target: { type: 'Invoice', id: 'INV-48210', label: 'Anjali Krishnan' }, reason: 'Charged twice' },
  { ago: 3 * HOUR + 40 * MIN, actor: 'lakshmi', action: 'admin.role_changed', summary: 'Changed Arvind Menon’s role', category: 'access', severity: 'critical', target: { type: 'Admin', id: 'arvind.menon@elab.com', label: 'Arvind Menon' }, changes: [{ field: 'Role', before: 'Content editor', after: 'Platform admin' }] },
  { ago: 5 * HOUR, actor: 'arvind', action: 'content.tier_changed', summary: 'Moved “Kubernetes Rollouts” to Premium', category: 'content', severity: 'info', target: { type: 'Problem', id: 'PRB-412', label: 'Kubernetes Rollouts' }, changes: [{ field: 'Tier', before: 'Free', after: 'Premium' }] },
  { ago: 9 * HOUR, actor: 'system', action: 'payment.failed', summary: 'Renewal payment failed for SUB-11204', category: 'billing', severity: 'info', target: { type: 'Subscription', id: 'SUB-11204', label: 'Karthik Hegde' }, reason: 'UPI mandate expired', outcome: 'failure' },
  { ago: 20 * HOUR, actor: 'lakshmi', action: 'settings.updated', summary: 'Updated Security settings', category: 'settings', severity: 'critical', target: { type: 'Settings', id: 'security', label: 'Security' }, changes: [{ field: 'Admin session timeout', before: '60 minutes', after: '30 minutes' }, { field: 'Lock after failed sign-ins', before: '8 attempts', after: '5 attempts' }] },
  { ago: 3 * DAY + 2 * HOUR, actor: 'lakshmi', action: 'settings.updated', summary: 'Updated Billing & tax settings', category: 'settings', severity: 'notice', target: { type: 'Settings', id: 'billing', label: 'Billing & tax' }, changes: [{ field: 'Past-due grace period', before: '5 days', after: '7 days' }] },
];

const SEED_COUNT = 300;

function seed(now: number): AuditEvent[] {
  const r = rng(4242);
  const drafts: { at: number; draft: Draft }[] = PINNED.map(({ ago, ...draft }) => ({ at: now - ago, draft }));
  for (let i = drafts.length; i < SEED_COUNT; i += 1) {
    const template = chooseTemplate(r);
    const offset = DAY + Math.pow(r(), 1.25) * 89 * DAY;
    const draft = template.build(r);
    drafts.push({ at: Math.round((now - offset) / 1000) * 1000, draft });
  }
  drafts.sort((a, b) => a.at - b.at);
  return drafts
    .map(({ at, draft }, index) => {
      const actor = typeof draft.actor === 'string' ? ACTORS[draft.actor] : draft.actor;
      return {
        id: `EV-${FIRST_ID + index}`,
        at,
        actor: { name: actor.name, email: actor.email, role: actor.role },
        action: draft.action,
        summary: draft.summary,
        category: draft.category,
        severity: draft.severity,
        target: draft.target,
        ip: actor.ip,
        location: actor.location,
        device: actor.device,
        changes: draft.changes,
        reason: draft.reason,
        outcome: draft.outcome ?? 'success',
      } satisfies AuditEvent;
    })
    .reverse();
}

function epoch() {
  const hour = new Date();
  hour.setMinutes(0, 0, 0);
  return hour.getTime();
}

function readExtra(): AuditEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { extra?: AuditEvent[] };
      if (Array.isArray(parsed.extra)) return parsed.extra;
    }
  } catch {}
  return [];
}

function writeExtra(extra: AuditEvent[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ extra }));
  } catch {}
}

export function appendAudit(input: AuditInput) {
  const extra = readExtra();
  const me = ACTORS.you;
  const event: AuditEvent = {
    ...input,
    id: `EV-${FIRST_ID + SEED_COUNT + extra.length}`,
    at: Date.now(),
    actor: { name: me.name, email: me.email, role: me.role },
    ip: me.ip,
    location: me.location,
    device: me.device,
    outcome: input.outcome ?? 'success',
  };
  writeExtra([event, ...extra]);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT));
  return event.id;
}

function loadAll() {
  return [...readExtra(), ...seed(epoch())].sort((a, b) => b.at - a.at);
}

export function useAuditLog() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);

  useEffect(() => {
    setEvents(loadAll());
    const refresh = () => setEvents(loadAll());
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) refresh();
    };
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setEvents(loadAll());
  }, []);

  return { events: events ?? [], loaded: events !== null, reset };
}

export function latestFor(events: AuditEvent[], targetType: string, targetId: string) {
  return events.find((event) => event.target.type === targetType && event.target.id === targetId) ?? null;
}
