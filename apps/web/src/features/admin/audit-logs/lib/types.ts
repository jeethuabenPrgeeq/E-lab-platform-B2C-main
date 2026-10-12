export type AuditCategory = 'content' | 'runtime' | 'judge' | 'monitoring' | 'support' | 'release' | 'auth';
export type AuditResult = 'success' | 'failure';

export interface AuditChange {
  field: string;
  before: string;
  after: string;
}

export interface AuditEvent {
  id: string;
  at: number;
  actor: { name: string; role: 'Platform admin' | 'Super admin' | 'System' };
  category: AuditCategory;
  action: string;
  summary: string;
  target: { type: string; id: string; label: string };
  result: AuditResult;
  error: string | null;
  sensitive: boolean;
  ip: string;
  userAgent: string;
  requestId: string;
  changes: AuditChange[];
}