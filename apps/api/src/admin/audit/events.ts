import type { Prisma } from '../../../generated/prisma/client/index.js';

export const CATEGORY_TYPES = {
  auth: ['auth'],
  users: ['user'],
  access: ['admin', 'admin_role'],
  content: ['problem', 'technology', 'test_case', 'source_check', 'learning_path', 'challenge'],
  billing: ['payment', 'subscription', 'coupon', 'plan_price'],
  settings: ['settings'],
  support: ['support_ticket'],
  notifications: ['campaign', 'automation'],
  reports: ['report_run', 'report_schedule'],
  platform: ['judge_worker', 'judge_settings', 'runtime', 'code_run', 'rejudge_job', 'plagiarism_flag', 'incident', 'release', 'problem_report', 'tech_ticket'],
} as const;

export type AuditCategory = keyof typeof CATEGORY_TYPES;
export type AuditSeverity = 'info' | 'notice' | 'critical';

export const CATEGORIES = Object.keys(CATEGORY_TYPES) as AuditCategory[];
export const SEVERITIES: AuditSeverity[] = ['info', 'notice', 'critical'];

const CRITICAL_ACTIONS = ['auth.token_reuse', 'auth.blocked', 'admin.revoke', 'admin.role', 'role.permissions', 'role.delete', 'settings.security', 'judge.queue_pause'];
const NOTICE_PREFIXES = ['auth.login_failed', 'admin.', 'role.', 'settings.', 'user.suspend', 'user.reset_password', 'payment.refund', 'payment.reject_refund', 'subscription.cancel', 'coupon.end', 'campaign.send', 'catalog.retired', 'problem.unpublish', 'problem.deprecate', 'judge.worker_remove', 'judge.worker_drain', 'judge.limits', 'judge.job_cancel', 'submission.override', 'submission.rejudge', 'plagiarism.confirmed', 'release.rollback', 'release.promote', 'incident.declare', 'incident.severity', 'tech_ticket.escalate'];
const NOTICE_SUFFIXES = ['.delete'];

export function categoryOf(entityType: string): AuditCategory {
  for (const category of CATEGORIES) if ((CATEGORY_TYPES[category] as readonly string[]).includes(entityType)) return category;
  return 'settings';
}

export function severityOf(action: string): AuditSeverity {
  if (CRITICAL_ACTIONS.includes(action)) return 'critical';
  if (NOTICE_PREFIXES.some((prefix) => action.startsWith(prefix)) || NOTICE_SUFFIXES.some((suffix) => action.endsWith(suffix))) return 'notice';
  return 'info';
}

const noticeWhere: Prisma.TechnicalAuditLogWhereInput[] = [
  ...NOTICE_PREFIXES.map((prefix) => ({ action: { startsWith: prefix } })),
  ...NOTICE_SUFFIXES.map((suffix) => ({ action: { endsWith: suffix } })),
];

export function severityWhere(severity: AuditSeverity): Prisma.TechnicalAuditLogWhereInput {
  if (severity === 'critical') return { action: { in: CRITICAL_ACTIONS } };
  if (severity === 'notice') return { AND: [{ OR: noticeWhere }, { action: { notIn: CRITICAL_ACTIONS } }] };
  return { AND: [{ action: { notIn: CRITICAL_ACTIONS } }, { NOT: { OR: noticeWhere } }] };
}

export interface AuditChange {
  field: string;
  before: string;
  after: string;
}

const text = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : Array.isArray(value) ? (value.length ? value.join(', ') : 'None') : String(value));

const isChange = (value: unknown): value is { field: unknown; before: unknown; after: unknown } => typeof value === 'object' && value !== null && 'field' in value;

export function readChanges(action: string, raw: unknown): { changes: AuditChange[]; reason: string | null } {
  if (raw === null || raw === undefined) return { changes: [], reason: null };
  const toChanges = (list: unknown[]) => list.filter(isChange).map((item) => ({ field: String(item.field), before: text(item.before), after: text(item.after) }));
  if (Array.isArray(raw)) return { changes: toChanges(raw), reason: null };
  if (typeof raw !== 'object') return { changes: [], reason: null };
  const obj = raw as Record<string, unknown>;
  const reason = typeof obj.reason === 'string' && obj.reason.trim() ? obj.reason.trim() : null;
  if (Array.isArray(obj.fields)) return { changes: toChanges(obj.fields), reason };
  if (Array.isArray(obj.added) || Array.isArray(obj.removed)) {
    const changes: AuditChange[] = [];
    if (Array.isArray(obj.added) && obj.added.length) changes.push({ field: 'Permissions added', before: '—', after: text(obj.added) });
    if (Array.isArray(obj.removed) && obj.removed.length) changes.push({ field: 'Permissions removed', before: text(obj.removed), after: '—' });
    return { changes, reason };
  }
  if ('before' in obj || 'after' in obj) {
    const field = action.split('.').slice(1).join(' ').replace(/_/g, ' ') || 'Value';
    return { changes: [{ field: field.charAt(0).toUpperCase() + field.slice(1), before: text(obj.before), after: text(obj.after) }], reason };
  }
  return { changes: [], reason };
}

const PRIVATE = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd)/;

export function cleanIp(ip: string | null) {
  if (!ip) return null;
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

export function locationOf(ip: string | null) {
  if (!ip) return '—';
  return PRIVATE.test(ip) ? 'Local network' : 'Unknown';
}

export function deviceOf(agent: string | null) {
  if (!agent) return '—';
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /OPR\//.test(agent)
      ? 'Opera'
      : /Chrome\//.test(agent)
        ? 'Chrome'
        : /Firefox\//.test(agent)
          ? 'Firefox'
          : /Safari\//.test(agent)
            ? 'Safari'
            : /PowerShell/i.test(agent)
              ? 'PowerShell'
              : /curl/i.test(agent)
                ? 'curl'
                : /python/i.test(agent)
                  ? 'Python script'
                  : /node|undici|axios/i.test(agent)
                    ? 'Script'
                    : 'Unknown client';
  const os = /Windows/.test(agent) ? 'Windows' : /Android/.test(agent) ? 'Android' : /iPhone|iPad/.test(agent) ? 'iOS' : /Mac OS X|Macintosh/.test(agent) ? 'macOS' : /Linux/.test(agent) ? 'Linux' : null;
  return os ? `${browser} on ${os}` : browser;
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export function toCsv(rows: string[][]) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}