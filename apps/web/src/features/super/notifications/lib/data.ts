'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ME, estimateRecipients } from './shared';
import type { Automation, Campaign, CampaignActivity, CampaignInput } from './types';

const KEY = 'elab_super_notifications_v1';
const DAY = 86_400_000;
const HOUR = 3_600_000;

interface State {
  campaigns: Campaign[];
  automations: Automation[];
}

type Seed = CampaignInput & { status: Campaign['status']; offsetHours: number; createdBy: string; openShare?: number; clickShare?: number };

const SEEDS: Seed[] = [
  { name: 'Diwali sale announcement', subject: 'Diwali sale: 25% off every plan', body: 'Celebrate with 25% off any eLab plan from 1 to 14 November. Use code DIWALI25 at checkout.', link: '/pricing', channels: ['email', 'in_app', 'push'], audience: { kind: 'free', value: null }, sendAt: null, status: 'scheduled', offsetHours: 24 * 24 + 10, createdBy: 'Lakshmi V' },
  { name: 'October Long Challenge reminder', subject: 'One week left in the October Long Challenge', body: 'You have 7 days left to solve all 8 problems and climb the leaderboard. ₹50,000 in prizes!', link: '/challenges', channels: ['in_app', 'push'], audience: { kind: 'all', value: null }, sendAt: null, status: 'scheduled', offsetHours: 20, createdBy: 'Joel Thomas' },
  { name: 'Win-back: inactive learners', subject: 'We saved your progress', body: 'Your streak is waiting. Pick up where you left off — your next problem takes about 15 minutes.', link: '/dashboard', channels: ['email'], audience: { kind: 'inactive', value: null }, sendAt: null, status: 'draft', offsetHours: 0, createdBy: 'Lakshmi V' },
  { name: 'DevOps Essentials launch', subject: 'New: DevOps Essentials path', body: 'Git, Linux and Docker labs in a real terminal — 12 hands-on steps with a certificate at the end.', link: '/learning-paths', channels: ['email', 'in_app'], audience: { kind: 'paid', value: null }, sendAt: null, status: 'sent', offsetHours: -5 * 24, createdBy: 'Joel Thomas', openShare: 0.46, clickShare: 0.14 },
  { name: 'Payment method update', subject: 'Action needed: update your payment method', body: 'Your card expires this month. Update it under Settings → Billing so your plan keeps renewing.', link: '/settings/billing', channels: ['email', 'in_app'], audience: { kind: 'plan', value: 'professional' }, sendAt: null, status: 'sent', offsetHours: -9 * 24, createdBy: 'Fathima Rasheed', openShare: 0.62, clickShare: 0.31 },
  { name: 'Weekly Code Sprint #43', subject: 'Weekly Code Sprint starts at 8 PM', body: 'Four problems, two hours, ₹10,000 in prizes. Register now to get a reminder 15 minutes before.', link: '/challenges', channels: ['push', 'in_app'], audience: { kind: 'all', value: null }, sendAt: null, status: 'sent', offsetHours: -4 * 24 - 4, createdBy: 'Joel Thomas', openShare: 0.22, clickShare: 0.09 },
  { name: 'Christ University orientation', subject: 'Welcome to eLab, Christ University!', body: 'Your institution has set you up with eLab. Start with the Python Foundations path — it takes about 4 hours.', link: '/learning-paths', channels: ['email', 'in_app'], audience: { kind: 'institution', value: 'Christ University' }, sendAt: null, status: 'sent', offsetHours: -14 * 24, createdBy: 'Lakshmi V', openShare: 0.71, clickShare: 0.38 },
  { name: 'Scheduled maintenance notice', subject: 'Short maintenance on Sunday 2 AM', body: 'eLab will be unavailable for about 20 minutes on Sunday from 2:00 AM IST while we upgrade the judge.', link: '', channels: ['in_app', 'email'], audience: { kind: 'all', value: null }, sendAt: null, status: 'sent', offsetHours: -20 * 24, createdBy: 'Arjun Pillai', openShare: 0.38, clickShare: 0.02 },
  { name: 'Trial ending nudge (test)', subject: 'Your trial ends soon', body: 'Keep your progress and certificates — upgrade before your trial ends.', link: '/pricing', channels: ['email'], audience: { kind: 'trial', value: null }, sendAt: null, status: 'cancelled', offsetHours: -2 * 24, createdBy: 'Lakshmi V' },
];

const AUTOMATIONS: Automation[] = [
  { id: 'AUTO-1', name: 'Welcome email', trigger: 'Right after someone signs up', channels: ['email'], enabled: true, subject: 'Welcome to eLab 👋', body: 'Here is how to solve your first problem in under 10 minutes.', sent30: 1858, openRate: 64, locked: false },
  { id: 'AUTO-2', name: 'Renewal reminder', trigger: '7 days before an annual or quarterly renewal', channels: ['email'], enabled: true, subject: 'Your eLab plan renews soon', body: 'Your plan renews on {date} for {amount}. Change or cancel any time before then.', sent30: 412, openRate: 58, locked: true },
  { id: 'AUTO-3', name: 'Payment failed', trigger: 'When a renewal charge fails', channels: ['email', 'in_app'], enabled: true, subject: 'We could not process your payment', body: 'Update your payment method to keep your plan active. We will retry in 24 hours.', sent30: 61, openRate: 81, locked: true },
  { id: 'AUTO-4', name: 'Trial ending', trigger: '3 days before a trial ends', channels: ['email', 'in_app'], enabled: true, subject: 'Your trial ends in 3 days', body: 'Keep your progress, streak and certificates by choosing a plan.', sent30: 590, openRate: 52, locked: false },
  { id: 'AUTO-5', name: 'Streak at risk', trigger: 'At 8 PM if a learner with a 3+ day streak has not practised today', channels: ['push', 'in_app'], enabled: true, subject: 'Keep your streak alive 🔥', body: 'One quick problem keeps your {streak}-day streak going.', sent30: 7340, openRate: 27, locked: false },
  { id: 'AUTO-6', name: 'Certificate issued', trigger: 'When a learner completes a certified path', channels: ['email', 'in_app'], enabled: true, subject: 'Your certificate is ready', body: 'Congratulations on finishing {path}! Download or share your certificate.', sent30: 214, openRate: 77, locked: false },
  { id: 'AUTO-7', name: 'Weekly progress digest', trigger: 'Every Monday at 9 AM', channels: ['email'], enabled: false, subject: 'Your week on eLab', body: 'You solved {count} problems last week. Here is what to try next.', sent30: 0, openRate: 0, locked: false },
];

function seed(now: number): State {
  const campaigns: Campaign[] = SEEDS.map((spec, index) => {
    const hour = new Date(now);
    hour.setMinutes(0, 0, 0);
    const when = hour.getTime() + spec.offsetHours * HOUR;
    const recipients = estimateRecipients(spec.audience, spec.channels);
    const createdAt = Math.min(now, when) - 2 * DAY;
    const sent = spec.status === 'sent';
    const delivered = sent ? Math.round(recipients * 0.97) : 0;
    const activity: CampaignActivity[] = [{ at: createdAt, text: 'Created as a draft', actor: spec.createdBy }];
    if (spec.status === 'scheduled' || sent) activity.push({ at: createdAt + HOUR, text: sent ? 'Scheduled' : `Scheduled for ${new Date(when).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}`, actor: spec.createdBy });
    if (sent) activity.push({ at: when, text: `Sent to ${recipients.toLocaleString('en-IN')} people`, actor: 'System' });
    if (spec.status === 'cancelled') activity.push({ at: now - DAY, text: 'Cancelled: sent to the wrong audience in testing', actor: spec.createdBy });
    return {
      id: `NT-${501 + index}`,
      name: spec.name,
      subject: spec.subject,
      body: spec.body,
      link: spec.link,
      channels: spec.channels,
      audience: spec.audience,
      sendAt: spec.status === 'scheduled' || sent ? when : null,
      status: spec.status,
      createdBy: spec.createdBy,
      createdAt,
      sentAt: sent ? when : null,
      recipients: sent || spec.status === 'scheduled' ? recipients : 0,
      delivered,
      opened: sent ? Math.round(delivered * (spec.openShare ?? 0.4)) : 0,
      clicked: sent ? Math.round(delivered * (spec.clickShare ?? 0.1)) : 0,
      activity,
    };
  });
  return { campaigns, automations: AUTOMATIONS.map((automation) => ({ ...automation })) };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (Array.isArray(parsed?.campaigns) && Array.isArray(parsed?.automations)) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

function persist(state: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  return state;
}

const log = (campaign: Campaign, text: string): CampaignActivity[] => [...campaign.activity, { at: Date.now(), text, actor: ME }];

function deliver(campaign: Campaign, at: number): Campaign {
  const recipients = estimateRecipients(campaign.audience, campaign.channels);
  return { ...campaign, status: 'sent', sendAt: at, sentAt: at, recipients, delivered: Math.round(recipients * 0.97), opened: 0, clicked: 0, activity: log(campaign, `Sent to ${recipients.toLocaleString('en-IN')} people`) };
}

export function useNotifications() {
  const [state, setState] = useState<State | null>(null);
  const stateRef = useRef<State | null>(null);
  stateRef.current = state;

  useEffect(() => {
    setState(load());
  }, []);

  const commit = useCallback((fn: (current: State) => State) => setState((current) => (current ? persist(fn(current)) : current)), []);

  const updateCampaign = useCallback((id: string, fn: (campaign: Campaign) => Campaign) => commit((current) => ({ ...current, campaigns: current.campaigns.map((campaign) => (campaign.id === id ? fn(campaign) : campaign)) })), [commit]);

  const save = useCallback(
    (input: CampaignInput, mode: 'draft' | 'schedule' | 'now', id: string | null): string => {
      const now = Date.now();
      const current = stateRef.current?.campaigns ?? [];
      const existing = id ? current.find((campaign) => campaign.id === id) : undefined;
      const base: Campaign = existing
        ? { ...existing, ...input }
        : { ...input, id: `NT-${Math.max(500, ...current.map((campaign) => Number(campaign.id.slice(3)))) + 1}`, status: 'draft', createdBy: ME, createdAt: now, sentAt: null, recipients: 0, delivered: 0, opened: 0, clicked: 0, activity: [{ at: now, text: 'Created as a draft', actor: ME }] };
      let next: Campaign;
      if (mode === 'now') next = deliver(base, now);
      else if (mode === 'schedule' && input.sendAt) next = { ...base, status: 'scheduled', recipients: estimateRecipients(input.audience, input.channels), activity: log(base, `Scheduled for ${new Date(input.sendAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}`) };
      else next = { ...base, status: 'draft', sendAt: null, activity: existing ? log(base, 'Edited the draft') : base.activity };
      commit((state) => ({ ...state, campaigns: existing ? state.campaigns.map((campaign) => (campaign.id === next.id ? next : campaign)) : [next, ...state.campaigns] }));
      return next.id;
    },
    [commit],
  );

  const sendNow = useCallback((id: string) => updateCampaign(id, (campaign) => deliver(campaign, Date.now())), [updateCampaign]);

  const cancel = useCallback((id: string, reason: string) => updateCampaign(id, (campaign) => ({ ...campaign, status: 'cancelled', activity: log(campaign, `Cancelled: ${reason}`) })), [updateCampaign]);

  const unschedule = useCallback((id: string) => updateCampaign(id, (campaign) => ({ ...campaign, status: 'draft', sendAt: null, activity: log(campaign, 'Moved back to draft') })), [updateCampaign]);

  const remove = useCallback((id: string) => commit((current) => ({ ...current, campaigns: current.campaigns.filter((campaign) => campaign.id !== id) })), [commit]);

  const toggleAutomation = useCallback(
    (id: string): string | null => {
      const automation = stateRef.current?.automations.find((item) => item.id === id);
      if (!automation) return 'Not found';
      if (automation.locked && automation.enabled) return `${automation.name} is required for billing and cannot be turned off`;
      commit((current) => ({ ...current, automations: current.automations.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)) }));
      return null;
    },
    [commit],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setState(seed(Date.now()));
  }, []);

  return { campaigns: state?.campaigns ?? [], automations: state?.automations ?? [], loaded: state !== null, save, sendNow, cancel, unschedule, remove, toggleAutomation, reset };
}

export type NotificationStore = ReturnType<typeof useNotifications>;
