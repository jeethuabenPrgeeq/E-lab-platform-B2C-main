'use client';

import { useCallback, useEffect, useState } from 'react';
import { ME } from './shared';
import type { RequesterRole, Ticket, TicketCategory, TicketMessage, TicketPriority, TicketStatus } from './types';

const KEY = 'elab_support_tickets_v1';
const MIN = 60_000;

interface SeedDef {
  subject: string;
  name: string;
  role: RequesterRole;
  org: string;
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
    subject: 'Submissions stuck on "Judging" then failing with sandbox error',
    name: 'Priya Nair',
    role: 'Institution admin',
    org: 'Christ University',
    category: 'judge',
    priority: 'urgent',
    status: 'new',
    assignee: null,
    ageMin: 75,
    thread: [
      ['requester', 'Since about an hour ago many of our learners see their code stuck on "Judging" and then a "Sandbox error". We have a graded lab running right now — please help urgently.'],
    ],
  },
  {
    subject: 'Cannot log in after password reset',
    name: 'Rahul Menon',
    role: 'Learner',
    org: 'NIT Calicut',
    category: 'login',
    priority: 'high',
    status: 'new',
    assignee: null,
    ageMin: 140,
    thread: [['requester', 'I reset my password but the new one says "Invalid email or password". I tried twice.']],
  },
  {
    subject: 'Code editor freezes when pasting large input',
    name: 'Anita George',
    role: 'Instructor',
    org: 'Amrita Vishwa Vidyapeetham',
    category: 'ide',
    priority: 'normal',
    status: 'open',
    assignee: 'You',
    ageMin: 300,
    responseMin: 25,
    thread: [
      ['requester', 'When I paste a 2 MB test input into the custom input box the editor freezes for 20+ seconds.'],
      ['agent', 'Thanks Anita, we can reproduce this. Could you tell us which browser you are using?'],
      ['requester', 'Chrome 129 on Windows 11.'],
      ['note', 'Likely the syntax highlighter running on the input box. Raised with the frontend team.'],
    ],
  },
  {
    subject: 'Add 40 more learner licences for the new batch',
    name: 'Vikram Shetty',
    role: 'Institution admin',
    org: 'PES University',
    category: 'account',
    priority: 'low',
    status: 'pending',
    assignee: 'Meera S',
    ageMin: 1500,
    responseMin: 90,
    thread: [
      ['requester', 'We have a new batch joining next week. Can you add 40 more learner seats to our plan?'],
      ['agent', 'Happy to help. Could you confirm the batch start date and the billing contact for the purchase order?'],
    ],
  },
  {
    subject: 'Assessment timer reset after network drop',
    name: 'Fathima Rasheed',
    role: 'Learner',
    org: 'Christ University',
    category: 'assessment',
    priority: 'high',
    status: 'open',
    assignee: 'Ravi K',
    ageMin: 220,
    responseMin: 300,
    thread: [
      ['requester', 'My Wi-Fi dropped during the DSA assessment and when I came back the timer showed the full time again but my answers were gone.'],
      ['agent', 'Sorry about this, Fathima. We can see two sessions on your attempt. We are checking whether the first set of answers can be restored.'],
    ],
  },
  {
    subject: 'Java submissions slower than C++ for the same logic',
    name: 'Karthik Rao',
    role: 'Instructor',
    org: 'RV College of Engineering',
    category: 'judge',
    priority: 'normal',
    status: 'new',
    assignee: null,
    ageMin: 35,
    thread: [['requester', 'Our Java learners keep getting TLE on Dijkstra while C++ passes. Is the time limit adjusted per language?']],
  },
  {
    subject: 'SSO with Google Workspace not redirecting',
    name: 'Deepa Krishnan',
    role: 'Institution admin',
    org: 'Amrita Vishwa Vidyapeetham',
    category: 'login',
    priority: 'urgent',
    status: 'resolved',
    assignee: 'Arjun P',
    ageMin: 2900,
    responseMin: 18,
    resolvedMin: 240,
    rating: 5,
    thread: [
      ['requester', 'Learners clicking "Sign in with Google" land on a blank page.'],
      ['agent', 'Thanks Deepa — the redirect URI on your SSO connection was missing the new domain. We have updated it, could you try again?'],
      ['requester', 'Works now, thank you!'],
    ],
  },
  {
    subject: 'Problem statement images not loading',
    name: 'Suresh Babu',
    role: 'Learner',
    org: 'NIT Calicut',
    category: 'other',
    priority: 'low',
    status: 'resolved',
    assignee: 'Meera S',
    ageMin: 4300,
    responseMin: 200,
    resolvedMin: 600,
    rating: 3,
    thread: [
      ['requester', 'The diagrams in the Matrix Spiral problem do not show up.'],
      ['agent', 'Our CDN had a cache issue for some images. It is fixed now — please hard refresh the page.'],
    ],
  },
  {
    subject: 'Export of assessment results is missing columns',
    name: 'Meghana Reddy',
    role: 'Instructor',
    org: 'PES University',
    category: 'assessment',
    priority: 'normal',
    status: 'resolved',
    assignee: 'You',
    ageMin: 5800,
    responseMin: 45,
    resolvedMin: 1400,
    rating: 4,
    thread: [
      ['requester', 'The CSV export does not include the per-question marks.'],
      ['agent', 'Per-question marks are under "Detailed export". We have also added a hint on the export page.'],
    ],
  },
  {
    subject: 'Learner sees another institution in the dropdown',
    name: 'Ananya Iyer',
    role: 'Learner',
    org: 'RV College of Engineering',
    category: 'account',
    priority: 'high',
    status: 'pending',
    assignee: 'Arjun P',
    ageMin: 980,
    responseMin: 60,
    thread: [
      ['requester', 'When I switch workspaces I see "PES University" listed even though I never joined it.'],
      ['agent', 'Thanks Ananya. Could you share a screenshot of the workspace switcher so we can check the membership?'],
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
      id: `TS-${2201 + index}`,
      subject: def.subject,
      requester: {
        name: def.name,
        email: `${def.name.toLowerCase().replace(/[^a-z]+/g, '.')}@${def.org.toLowerCase().split(' ')[0]}.edu`,
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