'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ME, STATUS_META } from './shared';
import type { ComponentId, DeclareInput, Incident, IncidentStatus, IncidentUpdate, Postmortem, Severity } from './types';

const KEY = 'elab_incidents_v1';
const MIN = 60_000;

interface SeedDef {
  title: string;
  severity: Severity;
  status: IncidentStatus;
  components: ComponentId[];
  commander: string;
  ageMin: number;
  durationMin?: number;
  links?: Incident['links'];
  steps: [IncidentStatus, number, string, boolean][];
  postmortem?: Omit<Postmortem, 'savedAt'>;
}

const SEEDS: SeedDef[] = [
  {
    title: 'judge-02 failing to start sandboxes',
    severity: 'sev2',
    status: 'identified',
    components: ['judge', 'sandbox'],
    commander: 'Ravi K',
    ageMin: 24,
    links: [
      { kind: 'alert', label: 'Alert · Sandbox errors', href: '/executions/alerts' },
      { kind: 'ticket', label: 'TS-2201 · Christ University', href: '/support' },
    ],
    steps: [
      ['investigating', 0, 'Sandbox error alert firing. Around 30% of executions on judge-02 fail before user code starts. Investigating.', true],
      ['identified', 14, 'Image pull for elab/runner is timing out on judge-02 after a registry certificate rotation. Draining judge-02 while we fix the trust store.', true],
    ],
  },
  {
    title: 'Code editor slow when pasting large inputs',
    severity: 'sev3',
    status: 'monitoring',
    components: ['editor'],
    commander: 'Arjun P',
    ageMin: 290,
    links: [{ kind: 'ticket', label: 'TS-2203 · Amrita Vishwa Vidyapeetham', href: '/support' }],
    steps: [
      ['investigating', 0, 'Reports of the editor freezing for 20+ seconds when pasting very large custom input.', true],
      ['identified', 60, 'Syntax highlighting is being applied to the custom input box. Disabling it for inputs above 100 KB.', true],
      ['monitoring', 210, 'Fix deployed. Watching editor performance metrics before closing.', true],
    ],
  },
  {
    title: 'Slow executions across all languages',
    severity: 'sev2',
    status: 'resolved',
    components: ['judge'],
    commander: 'Meera S',
    ageMin: 190,
    durationMin: 14,
    links: [{ kind: 'alert', label: 'Alert · Slow executions', href: '/executions/alerts' }],
    steps: [
      ['investigating', 0, 'p95 run time above 1.2 s on all workers. Investigating.', true],
      ['identified', 5, 'A noisy neighbour on the shared host pool was saturating CPU. Moving judge workers to dedicated hosts.', true],
      ['resolved', 14, 'Run times are back to normal. We will publish a postmortem.', true],
    ],
    postmortem: {
      summary: 'For 14 minutes executions ran about 3.5× slower than usual and the time-limit exceeded rate spiked to 25%.',
      rootCause: 'Judge workers shared hosts with a batch job that saturated CPU. No CPU isolation was configured.',
      actions: 'Move judge workers to a dedicated host pool (done)\nAdd CPU steal time to the Execution Monitoring alerts\nRejudge TLE submissions from the window',
    },
  },
  {
    title: 'Google SSO sign-in redirecting to a blank page',
    severity: 'sev1',
    status: 'resolved',
    components: ['auth'],
    commander: 'Arjun P',
    ageMin: 2900,
    durationMin: 190,
    links: [{ kind: 'ticket', label: 'TS-2207 · Amrita Vishwa Vidyapeetham', href: '/support' }],
    steps: [
      ['investigating', 0, 'Learners using "Sign in with Google" land on a blank page. Email login still works.', true],
      ['identified', 40, 'The OAuth redirect URI list is missing the new learner domain after yesterday’s release.', true],
      ['monitoring', 150, 'Redirect URIs updated for all SSO connections. Monitoring sign-in success rate.', true],
      ['resolved', 190, 'Sign-in success rate back above 99%.', true],
    ],
    postmortem: {
      summary: 'Google SSO sign-in failed for 3 hours 10 minutes for institutions on the new learner domain.',
      rootCause: 'A release changed the learner domain without updating OAuth redirect URIs.',
      actions: 'Add redirect URI checks to the release checklist\nAlert on SSO callback error rate',
    },
  },
  {
    title: 'Assessment timer reset after reconnect',
    severity: 'sev2',
    status: 'resolved',
    components: ['assessments'],
    commander: 'Ravi K',
    ageMin: 7400,
    durationMin: 300,
    steps: [
      ['investigating', 0, 'Some learners report the timer restarting and answers missing after a network drop.', false],
      ['identified', 90, 'A second session was created on reconnect instead of resuming the first.', false],
      ['resolved', 300, 'Resume logic fixed and affected attempts restored.', true],
    ],
  },
];

function seed(now: number): Incident[] {
  return SEEDS.map((def, index) => {
    const startedAt = now - def.ageMin * MIN;
    const updates: IncidentUpdate[] = [
      { id: `u-${index}-d`, at: startedAt, author: def.commander, status: null, message: `Declared a ${def.severity.toUpperCase()} incident`, public: false, kind: 'event' },
      ...def.steps.map(([status, offset, message, isPublic], i) => ({
        id: `u-${index}-${i}`,
        at: startedAt + offset * MIN + (offset === 0 ? 1 : 0),
        author: def.commander,
        status,
        message,
        public: isPublic,
        kind: 'update' as const,
      })),
    ];
    const resolvedAt = def.durationMin !== undefined ? startedAt + def.durationMin * MIN : null;
    return {
      id: `INC-${311 - index}`,
      title: def.title,
      severity: def.severity,
      status: def.status,
      components: def.components,
      commander: def.commander,
      startedAt,
      resolvedAt,
      links: def.links ?? [],
      updates,
      postmortem: def.postmortem && resolvedAt ? { ...def.postmortem, savedAt: resolvedAt + 600 * MIN > now ? now : resolvedAt + 600 * MIN } : null,
    };
  });
}

function load(): Incident[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Incident[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

export function useIncidents() {
  const [items, setItems] = useState<Incident[] | null>(null);
  const itemsRef = useRef<Incident[] | null>(null);
  itemsRef.current = items;

  useEffect(() => {
    setItems(load());
  }, []);

  const save = (next: Incident[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    return next;
  };

  const mutate = useCallback((id: string, fn: (incident: Incident, now: number) => Incident) => {
    setItems((current) => (current ? save(current.map((incident) => (incident.id === id ? fn(incident, Date.now()) : incident))) : current));
  }, []);

  const event = (incident: Incident, now: number, message: string): IncidentUpdate[] => [
    ...incident.updates,
    { id: `u-${now}-${Math.random().toString(36).slice(2, 6)}`, at: now, author: ME, status: null, message, public: false, kind: 'event' },
  ];

  const declare = useCallback((input: DeclareInput) => {
    const existing = itemsRef.current ?? [];
    const id = `INC-${Math.max(0, ...existing.map((incident) => Number(incident.id.split('-')[1]))) + 1}`;
    const now = Date.now();
    setItems((current) => {
      if (!current) return current;
      const incident: Incident = {
        id,
        title: input.title,
        severity: input.severity,
        status: 'investigating',
        components: input.components,
        commander: input.commander,
        startedAt: now,
        resolvedAt: null,
        links: [],
        updates: [
          { id: `u-${now}-d`, at: now, author: ME, status: null, message: `Declared a ${input.severity.toUpperCase()} incident`, public: false, kind: 'event' },
          { id: `u-${now}-1`, at: now + 1, author: ME, status: 'investigating', message: input.message, public: true, kind: 'update' },
        ],
        postmortem: null,
      };
      return save([incident, ...current]);
    });
    return id;
  }, []);

  const postUpdate = useCallback(
    (id: string, status: IncidentStatus, message: string, isPublic: boolean) =>
      mutate(id, (incident, now) => ({
        ...incident,
        status,
        resolvedAt: status === 'resolved' ? now : null,
        updates: [...incident.updates, { id: `u-${now}`, at: now, author: ME, status, message, public: isPublic, kind: 'update' }],
      })),
    [mutate],
  );

  const setSeverity = useCallback(
    (id: string, severity: Severity) =>
      mutate(id, (incident, now) => ({ ...incident, severity, updates: event(incident, now, `Changed severity to ${severity.toUpperCase()}`) })),
    [mutate],
  );

  const setCommander = useCallback(
    (id: string, commander: string) =>
      mutate(id, (incident, now) => ({ ...incident, commander, updates: event(incident, now, `Handed incident command to ${commander}`) })),
    [mutate],
  );

  const toggleComponent = useCallback(
    (id: string, component: ComponentId, label: string) =>
      mutate(id, (incident, now) => {
        const has = incident.components.includes(component);
        if (has && incident.components.length === 1) return incident;
        return {
          ...incident,
          components: has ? incident.components.filter((item) => item !== component) : [...incident.components, component],
          updates: event(incident, now, `${has ? 'Removed' : 'Added'} affected component: ${label}`),
        };
      }),
    [mutate],
  );

  const reopen = useCallback(
    (id: string) =>
      mutate(id, (incident, now) => ({
        ...incident,
        status: 'investigating',
        resolvedAt: null,
        updates: [...incident.updates, { id: `u-${now}`, at: now, author: ME, status: 'investigating', message: `Reopened — ${STATUS_META.investigating.hint.toLowerCase()} again.`, public: true, kind: 'update' }],
      })),
    [mutate],
  );

  const savePostmortem = useCallback(
    (id: string, postmortem: Omit<Postmortem, 'savedAt'>) =>
      mutate(id, (incident, now) => ({
        ...incident,
        postmortem: { ...postmortem, savedAt: now },
        updates: event(incident, now, incident.postmortem ? 'Updated the postmortem' : 'Published the postmortem'),
      })),
    [mutate],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setItems(seed(Date.now()));
  }, []);

  return { items: items ?? [], loaded: items !== null, declare, postUpdate, setSeverity, setCommander, toggleComponent, reopen, savePostmortem, reset };
}