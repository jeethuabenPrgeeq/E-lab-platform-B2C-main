'use client';

import { useCallback, useEffect, useState } from 'react';
import { ME } from './shared';
import type { RequesterRole, Ticket, TicketCategory, TicketMessage, TicketPriority, TicketStatus } from './types';

const KEY = 'elab_super_support_v1';
const MIN = 60_000;

interface SeedDef {
  subject: string;
  name: string;
  role: RequesterRole;
  org: string;
  email?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string | null;
  ageMin: number;
  responseMin?: number;
  resolvedMin?: number;
  rating?: number;
  thread: [TicketMessage['kind'], string][];
}

const SEEDS: SeedDef[] = [
  {
    subject: 'Charged twice for my October renewal',
    name: 'Anjali Krishnan',
    role: 'Learner',
    org: 'Professional · monthly · SUB-11172',
    category: 'billing',
    priority: 'urgent',
    status: 'new',
    assignee: null,
    ageMin: 50,
    thread: [['requester', 'I see two debits of ₹199 on 5 Oct from eLab on my bank statement. Please refund one of them, this is my monthly budget.']],
  },
  {
    subject: 'Renewal failed but I was charged on UPI',
    name: 'Karthik Hegde',
    role: 'Learner',
    org: 'Starter · monthly · SUB-11204',
    category: 'billing',
    priority: 'high',
    status: 'new',
    assignee: null,
    ageMin: 290,
    thread: [['requester', 'eLab says my payment failed and my account is past due, but ₹79 was debited from my UPI. Transaction ID 6278XXXX1190.']],
  },
  {
    subject: 'Want to switch from monthly to annual and keep my discount',
    name: 'Nandini Rao',
    role: 'Learner',
    org: 'Premium · monthly · STUDENT15',
    category: 'plan',
    priority: 'normal',
    status: 'open',
    assignee: 'Sneha Varghese',
    ageMin: 420,
    responseMin: 40,
    thread: [
      ['requester', 'If I move to the annual Premium plan, will my STUDENT15 discount still apply?'],
      ['agent', 'Good question, Nandini. STUDENT15 applies to every payment, including annual. I can switch you now with credit for the unused days — shall I go ahead?'],
      ['requester', 'Yes please, switch me now.'],
    ],
  },
  {
    subject: 'Refund — forgot to cancel before renewal',
    name: 'Varun Gowda',
    role: 'Learner',
    org: 'Professional · monthly · SUB-10871',
    category: 'refund',
    priority: 'normal',
    status: 'pending',
    assignee: 'Rohan Das',
    ageMin: 1700,
    responseMin: 120,
    thread: [
      ['requester', 'I meant to cancel last month but forgot. Can I get this month refunded? I have not used eLab since.'],
      ['agent', 'We can see no activity since your renewal, so we can refund this one. Could you confirm you also want the subscription cancelled?'],
    ],
  },
  {
    subject: 'Certificate shows my name misspelt',
    name: 'Siddharth Iyer',
    role: 'Learner',
    org: 'Starter · annual',
    category: 'certificate',
    priority: 'low',
    status: 'open',
    assignee: 'Asha Kumar',
    ageMin: 2600,
    responseMin: 300,
    thread: [
      ['requester', 'My Python Foundations certificate says "Sidharth". It should be "Siddharth" with two d’s.'],
      ['agent', 'Sorry about that! I have corrected your profile name — re-issuing needs a quick check from the content team.'],
      ['note', 'Certificate regeneration is manual for now. Asked Joel to re-issue.'],
    ],
  },
  {
    subject: 'Add 120 seats for our new MCA batch',
    name: 'Dr. Meera Pillai',
    role: 'Institution admin',
    org: 'Christ University · Enterprise',
    email: 'meera.pillai@christuniversity.edu.in',
    category: 'institution',
    priority: 'high',
    status: 'open',
    assignee: 'You',
    ageMin: 260,
    responseMin: 90,
    thread: [
      ['requester', 'We have 120 new MCA students joining on 14 Oct. Please add seats to our licence and send a revised quote.'],
      ['agent', 'Thank you, Dr. Pillai. I have passed this to our Sales team for the revised quote — you will hear from them today.'],
      ['note', 'Sales owns pricing for Enterprise. Waiting for Nikhil to send the quote.'],
    ],
  },
  {
    subject: 'Coupon NITC2026 says it is not valid',
    name: 'Rohan Menon',
    role: 'Learner',
    org: 'Free plan',
    category: 'plan',
    priority: 'normal',
    status: 'new',
    assignee: null,
    ageMin: 95,
    thread: [['requester', 'Our placement cell shared the code NITC2026 but checkout says "This code can’t be used". I am an NIT Calicut student.']],
  },
  {
    subject: 'Cannot log in — email changed after college',
    name: 'Fathima Rasheed',
    role: 'Learner',
    org: 'Professional · quarterly',
    category: 'account',
    priority: 'high',
    status: 'open',
    assignee: 'Sneha Varghese',
    ageMin: 330,
    responseMin: 290,
    thread: [
      ['requester', 'I signed up with my college email which no longer works, so I cannot reset my password. My subscription is still active.'],
      ['agent', 'We can move the account to a new email after a quick identity check. Please reply with the last 4 digits of the card used and your new email.'],
    ],
  },
  {
    subject: 'GST invoice needs our company GSTIN',
    name: 'Arjun George',
    role: 'Learner',
    org: 'Premium · annual',
    category: 'billing',
    priority: 'low',
    status: 'resolved',
    assignee: 'Rohan Das',
    ageMin: 5200,
    responseMin: 200,
    resolvedMin: 900,
    rating: 5,
    thread: [
      ['requester', 'My employer is reimbursing this. Can you re-issue the invoice with our GSTIN 29ABCDE1234F1Z5?'],
      ['agent', 'Done — the updated invoice with your GSTIN is attached and also available under Billing → Invoices.'],
      ['requester', 'Perfect, thanks!'],
    ],
  },
  {
    subject: 'Was charged after cancelling',
    name: 'Pooja Shetty',
    role: 'Learner',
    org: 'Starter · monthly',
    category: 'refund',
    priority: 'high',
    status: 'resolved',
    assignee: 'Asha Kumar',
    ageMin: 7400,
    responseMin: 60,
    resolvedMin: 1500,
    rating: 4,
    thread: [
      ['requester', 'I cancelled on 28 Sept but was still charged ₹79 on 1 Oct.'],
      ['agent', 'You are right — the cancellation was saved after the renewal had started. I have refunded the ₹79 in full.'],
    ],
  },
  {
    subject: 'Does Premium include the Kubernetes labs?',
    name: 'Tanvi Bhat',
    role: 'Prospect',
    org: 'Not subscribed',
    category: 'plan',
    priority: 'low',
    status: 'resolved',
    assignee: 'Sneha Varghese',
    ageMin: 3100,
    responseMin: 35,
    resolvedMin: 200,
    rating: 2,
    thread: [
      ['requester', 'Before I buy — does Premium include the Kubernetes in Practice path?'],
      ['agent', 'That path is still being prepared and is not live yet. All other DevOps labs are included in Professional and Premium.'],
      ['requester', 'Ok, I will wait then.'],
    ],
  },
  {
    subject: 'Institution invoice due date extension',
    name: 'Prof. Ramesh Babu',
    role: 'Institution admin',
    org: 'NIT Calicut · Enterprise',
    email: 'ramesh.babu@nitc.ac.in',
    category: 'institution',
    priority: 'normal',
    status: 'pending',
    assignee: 'You',
    ageMin: 2900,
    responseMin: 180,
    thread: [
      ['requester', 'Our finance office needs 15 more days to process the renewal PO. Can access continue till then?'],
      ['agent', 'Yes — I have added 15 days of access to your licence. Please send the PO once it is approved.'],
    ],
  },
];

function seed(now: number): Ticket[] {
  return SEEDS.map((def, index) => {
    const createdAt = now - def.ageMin * MIN;
    const firstResponseAt = def.responseMin !== undefined ? createdAt + def.responseMin * MIN : null;
    const resolvedAt = def.resolvedMin !== undefined ? createdAt + def.resolvedMin * MIN : null;
    const span = Math.max(1, (resolvedAt ?? now) - createdAt);
    let agentSeen = false;
    const messages: TicketMessage[] = def.thread.map(([kind, body], i) => {
      let at = createdAt + (span * i) / Math.max(1, def.thread.length);
      if (kind === 'agent' && !agentSeen && firstResponseAt) {
        at = firstResponseAt;
        agentSeen = true;
      }
      return {
        id: `m-${index}-${i}`,
        kind,
        author: kind === 'requester' ? def.name : def.assignee ?? 'Support',
        body,
        at,
      };
    });
    if (resolvedAt) messages.push({ id: `m-${index}-r`, kind: 'event', author: def.assignee ?? 'Support', body: 'Marked the ticket as resolved', at: resolvedAt });
    messages.sort((a, b) => a.at - b.at);
    return {
      id: `CS-${4101 + index}`,
      subject: def.subject,
      requester: {
        name: def.name,
        email: def.email ?? `${def.name.toLowerCase().replace(/[^a-z]+/g, '.')}@gmail.com`,
        role: def.role,
        org: def.org,
      },
      category: def.category,
      priority: def.priority,
      status: def.status,
      assignee: def.assignee,
      createdAt,
      updatedAt: messages[messages.length - 1].at,
      firstResponseAt,
      resolvedAt,
      rating: def.rating ?? null,
      messages,
    };
  });
}

function load(): Ticket[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Ticket[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

export function useTickets() {
  const [items, setItems] = useState<Ticket[] | null>(null);

  useEffect(() => {
    setItems(load());
  }, []);

  const mutate = useCallback((id: string, fn: (ticket: Ticket, now: number) => Ticket) => {
    setItems((current) => {
      if (!current) return current;
      const now = Date.now();
      const next = current.map((ticket) => (ticket.id === id ? { ...fn(ticket, now), updatedAt: now } : ticket));
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const event = (ticket: Ticket, now: number, body: string): TicketMessage[] => [
    ...ticket.messages,
    { id: `m-${now}-${Math.random().toString(36).slice(2, 6)}`, kind: 'event', author: ME, body, at: now },
  ];

  const reply = useCallback(
    (id: string, body: string, then: 'open' | 'pending' | 'resolved') =>
      mutate(id, (ticket, now) => {
        const messages: TicketMessage[] = [...ticket.messages, { id: `m-${now}`, kind: 'agent', author: ME, body, at: now }];
        if (then !== 'open' && then !== ticket.status) {
          messages.push({ id: `m-${now}-s`, kind: 'event', author: ME, body: then === 'pending' ? 'Set to pending — waiting on the requester' : 'Marked the ticket as resolved', at: now + 1 });
        }
        return {
          ...ticket,
          messages,
          status: then,
          assignee: ticket.assignee ?? ME,
          firstResponseAt: ticket.firstResponseAt ?? now,
          resolvedAt: then === 'resolved' ? now : null,
        };
      }),
    [mutate],
  );

  const addNote = useCallback(
    (id: string, body: string) => mutate(id, (ticket, now) => ({ ...ticket, messages: [...ticket.messages, { id: `m-${now}`, kind: 'note', author: ME, body, at: now }] })),
    [mutate],
  );

  const setStatus = useCallback(
    (id: string, status: TicketStatus) =>
      mutate(id, (ticket, now) => ({
        ...ticket,
        status,
        resolvedAt: status === 'resolved' ? now : null,
        messages: event(ticket, now, status === 'resolved' ? 'Marked the ticket as resolved' : status === 'pending' ? 'Set to pending — waiting on the requester' : status === 'open' && ticket.status === 'resolved' ? 'Reopened the ticket' : `Changed status to ${status}`),
      })),
    [mutate],
  );

  const setPriority = useCallback(
    (id: string, priority: TicketPriority) =>
      mutate(id, (ticket, now) => ({ ...ticket, priority, messages: event(ticket, now, `Changed priority to ${priority}`) })),
    [mutate],
  );

  const assign = useCallback(
    (id: string, assignee: string | null) =>
      mutate(id, (ticket, now) => ({
        ...ticket,
        assignee,
        messages: event(ticket, now, assignee ? `Assigned to ${assignee === ME ? 'themselves' : assignee}` : 'Removed the assignee'),
      })),
    [mutate],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setItems(seed(Date.now()));
  }, []);

  return { items: items ?? [], loaded: items !== null, reply, addNote, setStatus, setPriority, assign, reset };
}
