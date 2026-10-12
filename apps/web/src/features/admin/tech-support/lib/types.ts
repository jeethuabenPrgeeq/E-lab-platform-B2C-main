export type TicketStatus = 'new' | 'open' | 'pending' | 'resolved';
export type TicketPriority = 'urgent' | 'high' | 'normal' | 'low';
export type TicketCategory = 'login' | 'ide' | 'judge' | 'assessment' | 'account' | 'other';
export type RequesterRole = 'Institution admin' | 'Instructor' | 'Learner';

export interface TicketMessage {
  id: string;
  kind: 'requester' | 'agent' | 'note' | 'event';
  author: string;
  body: string;
  at: number;
}

export interface Ticket {
  id: string;
  subject: string;
  requester: { name: string; email: string; role: RequesterRole; org: string };
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string | null;
  createdAt: number;
  updatedAt: number;
  firstResponseAt: number | null;
  resolvedAt: number | null;
  rating: number | null;
  messages: TicketMessage[];
}