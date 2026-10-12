import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from './types';

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export const ME = 'You';
export const AGENTS = ['You', 'Sneha Varghese', 'Rohan Das', 'Asha Kumar'];

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
  billing: 'Payments & invoices',
  refund: 'Refunds',
  plan: 'Plans & upgrades',
  account: 'Account & login',
  certificate: 'Certificates',
  institution: 'Institution licences',
  technical: 'Technical escalation',
  other: 'Other',
};

export const CANNED: { label: string; body: string }[] = [
  { label: 'Acknowledge', body: 'Thanks for writing to eLab support. We are looking into this and will get back to you shortly.' },
  { label: 'Ask for invoice', body: 'Could you share the invoice number (it starts with INV-) or the email on the account? That helps us find the payment quickly.' },
  { label: 'Refund approved', body: 'We have approved your refund. It goes back to your original payment method and usually shows up in 5–7 working days.' },
  { label: 'Retry payment', body: 'Your renewal payment did not go through. You can update your card or UPI ID under Settings → Billing, and we will retry automatically within 24 hours.' },
  { label: 'Certificate re-issued', body: 'We have re-issued your certificate with the corrected details. You can download it again from My Learning → Certificates.' },
  { label: 'Resolved', body: 'This is now sorted on our side. Please reply if anything still looks wrong — otherwise we will close this ticket in 48 hours.' },
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
