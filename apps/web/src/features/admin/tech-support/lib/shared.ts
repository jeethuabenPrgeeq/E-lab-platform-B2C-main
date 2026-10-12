import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from './types';

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export const ME = 'You';
export const AGENTS = ['You', 'Ravi K', 'Meera S', 'Arjun P'];

const MIN = 60_000;

export const STATUS_META: Record<TicketStatus, { label: string; tone: string; hint: string }> = {
  new: { label: 'New', tone: 'danger', hint: 'Waiting for a first reply' },
  open: { label: 'Open', tone: 'primary', hint: 'Being worked on' },
  pending: { label: 'Pending', tone: 'warning', hint: 'Waiting on the requester' },
  resolved: { label: 'Resolved', tone: 'success', hint: 'Closed out' },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; tone: string; rank: number; slaMin: number }> = {
  urgent: { label: 'Urgent', tone: 'danger', rank: 0, slaMin: 60 },
  high: { label: 'High', tone: 'warning', rank: 1, slaMin: 240 },
  normal: { label: 'Normal', tone: 'primary', rank: 2, slaMin: 480 },
  low: { label: 'Low', tone: 'neutral', rank: 3, slaMin: 1440 },
};

export const CATEGORY_META: Record<TicketCategory, string> = {
  login: 'Login & access',
  ide: 'Code editor',
  judge: 'Judge & results',
  assessment: 'Assessments',
  account: 'Account & licences',
  other: 'Other',
};

export const CANNED: { label: string; body: string }[] = [
  { label: 'Acknowledge', body: 'Thanks for reaching out. We are looking into this now and will update you shortly.' },
  { label: 'Need more details', body: 'Could you share the learner ID, the problem name and a screenshot of the error? That will help us reproduce it.' },
  { label: 'Clear cache', body: 'Please try a hard refresh (Ctrl + Shift + R) or clear the browser cache, then sign in again. Let us know if the issue continues.' },
  { label: 'Known incident', body: 'This is caused by a known platform issue that our team is actively fixing. We will notify you as soon as it is resolved.' },
  { label: 'Resolved', body: 'This should now be fixed on our side. Please confirm everything works for you — we will close the ticket if we do not hear back in 48 hours.' },
];

export interface SlaState {
  label: string;
  tone: 'danger' | 'warning' | 'success' | 'neutral';
  breached: boolean;
}

export function slaOf(ticket: Ticket, now: number): SlaState {
  const target = PRIORITY_META[ticket.priority].slaMin * MIN;
  if (ticket.firstResponseAt) {
    const took = ticket.firstResponseAt - ticket.createdAt;
    return { label: `Replied in ${formatSpan(took)}`, tone: took > target ? 'warning' : 'success', breached: false };
  }
  if (ticket.status === 'resolved') return { label: '—', tone: 'neutral', breached: false };
  const left = ticket.createdAt + target - now;
  if (left < 0) return { label: `Overdue ${formatSpan(-left)}`, tone: 'danger', breached: true };
  return { label: `Due in ${formatSpan(left)}`, tone: left < target * 0.25 ? 'warning' : 'neutral', breached: false };
}

export function formatSpan(ms: number) {
  const minutes = Math.max(1, Math.round(ms / MIN));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  return hours % 24 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${Math.floor(hours / 24)}d`;
}

export function formatAgo(t: number, now: number) {
  const minutes = Math.max(0, Math.round((now - t) / MIN));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatDateTime(t: number) {
  const date = new Date(t);
  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}