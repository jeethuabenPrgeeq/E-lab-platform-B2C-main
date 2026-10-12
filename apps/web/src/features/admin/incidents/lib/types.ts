export type Severity = 'sev1' | 'sev2' | 'sev3';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type ComponentId = 'judge' | 'sandbox' | 'editor' | 'auth' | 'assessments' | 'api' | 'database';
export type ComponentHealth = 'operational' | 'degraded' | 'partial' | 'major';

export interface IncidentUpdate {
  id: string;
  at: number;
  author: string;
  status: IncidentStatus | null;
  message: string;
  public: boolean;
  kind: 'update' | 'event';
}

export interface Postmortem {
  summary: string;
  rootCause: string;
  actions: string;
  savedAt: number;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  components: ComponentId[];
  commander: string;
  startedAt: number;
  resolvedAt: number | null;
  links: { kind: 'alert' | 'ticket' | 'report'; label: string; href: string }[];
  updates: IncidentUpdate[];
  postmortem: Postmortem | null;
}

export interface DeclareInput {
  title: string;
  severity: Severity;
  components: ComponentId[];
  commander: string;
  message: string;
}