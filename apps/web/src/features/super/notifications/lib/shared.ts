import type { Audience, AudienceKind, CampaignInput, CampaignStatus, Channel } from './types';

export { ME, cx, formatAgo, formatDate } from '../../users/lib/shared';

export const CHANNEL_META: Record<Channel, { label: string; reach: number; limit: number }> = {
  in_app: { label: 'In-app', reach: 1, limit: 400 },
  email: { label: 'Email', reach: 0.94, limit: 2000 },
  push: { label: 'Mobile push', reach: 0.41, limit: 140 },
};

export const CHANNELS: Channel[] = ['in_app', 'email', 'push'];

export const PLAN_AUDIENCE: Record<string, { label: string; size: number }> = {
  starter: { label: 'Starter', size: 2450 },
  professional: { label: 'Professional', size: 1280 },
  premium: { label: 'Premium', size: 540 },
  enterprise: { label: 'Enterprise institutions', size: 4120 },
};

export const INSTITUTION_AUDIENCE = ['Christ University', 'NIT Calicut', 'PES University', 'Amrita Vishwa Vidyapeetham', 'RV College of Engineering', 'MS Ramaiah Institute', 'Anna University'];

export const AUDIENCE_META: Record<AudienceKind, { label: string; size: number; needsValue: boolean }> = {
  all: { label: 'Everyone', size: 18420, needsValue: false },
  paid: { label: 'Paying subscribers', size: 4305, needsValue: false },
  free: { label: 'Free accounts', size: 11240, needsValue: false },
  trial: { label: 'On a trial', size: 1860, needsValue: false },
  plan: { label: 'One plan', size: 0, needsValue: true },
  inactive: { label: 'Inactive for 30+ days', size: 8550, needsValue: false },
  institution: { label: 'One institution', size: 0, needsValue: true },
  instructors: { label: 'Instructors and institution admins', size: 1470, needsValue: false },
};

export function audienceSize(audience: Audience) {
  if (audience.kind === 'plan') return audience.value ? PLAN_AUDIENCE[audience.value]?.size ?? 0 : 0;
  if (audience.kind === 'institution') {
    if (!audience.value) return 0;
    let hash = 0;
    for (const char of audience.value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return 220 + (hash % 480);
  }
  return AUDIENCE_META[audience.kind].size;
}

export function audienceLabel(audience: Audience) {
  if (audience.kind === 'plan') return `${audience.value ? PLAN_AUDIENCE[audience.value]?.label ?? audience.value : 'A'} plan`;
  if (audience.kind === 'institution') return audience.value ?? 'One institution';
  return AUDIENCE_META[audience.kind].label;
}

export function estimateRecipients(audience: Audience, channels: Channel[]) {
  const size = audienceSize(audience);
  const reach = channels.length ? Math.max(...channels.map((channel) => CHANNEL_META[channel].reach)) : 0;
  return Math.round(size * reach);
}

export const STATUS_META: Record<CampaignStatus, { label: string; tone: string }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  scheduled: { label: 'Scheduled', tone: 'primary' },
  sent: { label: 'Sent', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export function validateCampaign(input: CampaignInput, now: number, sending: boolean) {
  const errors: Partial<Record<keyof CampaignInput, string>> = {};
  if (input.name.trim().length < 3) errors.name = 'Give the campaign an internal name';
  if (input.subject.trim().length < 4) errors.subject = 'Add a heading of at least 4 characters';
  if (input.body.trim().length < 10) errors.body = 'Write a message of at least 10 characters';
  if (input.channels.length === 0) errors.channels = 'Pick at least one channel';
  const limit = input.channels.length ? Math.min(...input.channels.map((channel) => CHANNEL_META[channel].limit)) : Infinity;
  if (input.body.trim().length > limit) errors.body = `Too long for ${input.channels.filter((channel) => CHANNEL_META[channel].limit === limit).map((channel) => CHANNEL_META[channel].label).join(', ')} — keep it under ${limit} characters`;
  if (input.link && !/^(\/[\w\-/?=&#.%]*|https:\/\/[\w.-]+\.[a-z]{2,}[\w\-/?=&#.%]*)$/i.test(input.link)) errors.link = 'Use a path like /learning-paths or a full https:// link';
  if (AUDIENCE_META[input.audience.kind].needsValue && !input.audience.value) errors.audience = 'Pick who this goes to';
  if (sending && input.sendAt !== null && input.sendAt < now + 5 * 60_000) errors.sendAt = 'Schedule at least 5 minutes ahead, or choose Send now';
  return errors;
}

export function rate(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 1000) / 10 : 0;
}
