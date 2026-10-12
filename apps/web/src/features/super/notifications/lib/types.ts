export type Channel = 'in_app' | 'email' | 'push';
export type AudienceKind = 'all' | 'paid' | 'free' | 'trial' | 'plan' | 'inactive' | 'institution' | 'instructors';
export type CampaignStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled';

export interface Audience {
  kind: AudienceKind;
  value: string | null;
}

export interface CampaignActivity {
  at: number;
  text: string;
  actor: string;
}

export interface CampaignInput {
  name: string;
  subject: string;
  body: string;
  link: string;
  channels: Channel[];
  audience: Audience;
  sendAt: number | null;
}

export interface Campaign extends CampaignInput {
  id: string;
  status: CampaignStatus;
  createdBy: string;
  createdAt: number;
  sentAt: number | null;
  recipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  activity: CampaignActivity[];
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  channels: Channel[];
  enabled: boolean;
  subject: string;
  body: string;
  sent30: number;
  openRate: number;
  locked: boolean;
}
