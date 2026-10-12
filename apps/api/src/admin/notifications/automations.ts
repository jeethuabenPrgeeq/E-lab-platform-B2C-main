import type { Channel } from './notifications.dto.js';

export interface AutomationDefinition {
  id: string;
  name: string;
  trigger: string;
  channels: Channel[];
  defaultEnabled: boolean;
  locked: boolean;
  subject: string;
  body: string;
}

export const AUTOMATIONS: AutomationDefinition[] = [
  { id: 'AUTO-1', name: 'Welcome email', trigger: 'Right after someone signs up', channels: ['email'], defaultEnabled: true, locked: false, subject: 'Welcome to eLab', body: 'Here is how to solve your first problem in under 10 minutes.' },
  { id: 'AUTO-2', name: 'Renewal reminder', trigger: '7 days before an annual or quarterly renewal', channels: ['email'], defaultEnabled: true, locked: true, subject: 'Your eLab plan renews soon', body: 'Your plan renews on {date} for {amount}. Change or cancel any time before then.' },
  { id: 'AUTO-3', name: 'Payment failed', trigger: 'When a renewal charge fails', channels: ['email', 'in_app'], defaultEnabled: true, locked: true, subject: 'We could not process your payment', body: 'Update your payment method to keep your plan active. We will retry in 24 hours.' },
  { id: 'AUTO-4', name: 'Trial ending', trigger: '3 days before a trial ends', channels: ['email', 'in_app'], defaultEnabled: true, locked: false, subject: 'Your trial ends in 3 days', body: 'Keep your progress, streak and certificates by choosing a plan.' },
  { id: 'AUTO-5', name: 'Streak at risk', trigger: 'At 8 PM if a learner with a 3+ day streak has not practised today', channels: ['push', 'in_app'], defaultEnabled: true, locked: false, subject: 'Keep your streak alive', body: 'One quick problem keeps your {streak}-day streak going.' },
  { id: 'AUTO-6', name: 'Certificate issued', trigger: 'When a learner completes a certified path', channels: ['email', 'in_app'], defaultEnabled: true, locked: false, subject: 'Your certificate is ready', body: 'Congratulations on finishing {path}! Download or share your certificate.' },
  { id: 'AUTO-7', name: 'Weekly progress digest', trigger: 'Every Monday at 9 AM', channels: ['email'], defaultEnabled: false, locked: false, subject: 'Your week on eLab', body: 'You solved {count} problems last week. Here is what to try next.' },
];