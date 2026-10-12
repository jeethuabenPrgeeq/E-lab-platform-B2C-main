export type AuditCategory = 'auth' | 'users' | 'access' | 'content' | 'billing' | 'settings' | 'support' | 'notifications' | 'reports' | 'platform';

export type AuditSeverity = 'info' | 'notice' | 'critical';

export type ActorRole = 'Super admin' | 'Platform admin' | 'Support agent' | 'System' | 'Unknown';

export interface AuditActor {
  name: string;
  email: string;
  role: ActorRole;
}

export interface AuditChange {
  field: string;
  before: string;
  after: string;
}

export interface AuditEvent {
  id: string;
  at: number;
  actor: AuditActor;
  action: string;
  summary: string;
  category: AuditCategory;
  severity: AuditSeverity;
  target: { type: string; id: string; label: string };
  ip: string;
  location: string;
  device: string;
  changes?: AuditChange[];
  reason?: string;
  outcome: 'success' | 'failure';
}

export type AuditInput = Omit<AuditEvent, 'id' | 'at' | 'ip' | 'location' | 'device' | 'actor' | 'outcome'> & { outcome?: 'success' | 'failure' };
