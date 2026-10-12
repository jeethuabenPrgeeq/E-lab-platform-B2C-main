'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ME } from '../../users/lib/shared';
import { RANGE_LABEL, TEMPLATE_MAP, rangeBounds, type RangeId, type TemplateId } from './templates';

const KEY = 'elab_super_reports_v1';
const DAY = 86_400_000;
const HOUR = 3_600_000;

export type Frequency = 'weekly' | 'monthly';
export type RunStatus = 'generating' | 'ready' | 'failed';

export interface ReportRun {
  id: string;
  templateId: TemplateId;
  range: RangeId | null;
  from: number;
  to: number;
  requestedBy: string;
  at: number;
  status: RunStatus;
  rows: number;
  note: string | null;
}

export interface Schedule {
  id: string;
  templateId: TemplateId;
  frequency: Frequency;
  weekday: number;
  dayOfMonth: number;
  hour: number;
  recipients: string[];
  active: boolean;
  createdBy: string;
  createdAt: number;
  lastRunAt: number | null;
  lastStatus: RunStatus | null;
}

export type ScheduleInput = Pick<Schedule, 'templateId' | 'frequency' | 'weekday' | 'dayOfMonth' | 'hour' | 'recipients'>;

interface ReportsState {
  runs: ReportRun[];
  schedules: Schedule[];
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function nextRun(schedule: Pick<Schedule, 'frequency' | 'weekday' | 'dayOfMonth' | 'hour'>, now: number) {
  const date = new Date(now);
  date.setMinutes(0, 0, 0);
  date.setHours(schedule.hour);
  if (schedule.frequency === 'weekly') {
    const diff = (schedule.weekday - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + diff);
    if (date.getTime() <= now) date.setDate(date.getDate() + 7);
    return date.getTime();
  }
  date.setDate(schedule.dayOfMonth);
  if (date.getTime() <= now) date.setMonth(date.getMonth() + 1, schedule.dayOfMonth);
  return date.getTime();
}

export function cadenceLabel(schedule: Pick<Schedule, 'frequency' | 'weekday' | 'dayOfMonth' | 'hour'>) {
  const time = new Date(2026, 0, 1, schedule.hour).toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true });
  if (schedule.frequency === 'weekly') return `Every ${WEEKDAYS[schedule.weekday]} at ${time}`;
  const suffix = schedule.dayOfMonth === 1 ? 'st' : schedule.dayOfMonth === 2 ? 'nd' : schedule.dayOfMonth === 3 ? 'rd' : 'th';
  return `Monthly on the ${schedule.dayOfMonth}${suffix} at ${time}`;
}

export const scheduleRange = (frequency: Frequency): RangeId => (frequency === 'weekly' ? '7d' : 'last_month');

function seed(now: number): ReportsState {
  const schedules: Schedule[] = [
    { id: 'SCH-1', templateId: 'revenue', frequency: 'weekly', weekday: 1, dayOfMonth: 1, hour: 9, recipients: ['finance@elab.com', 'lakshmi.v@elab.com'], active: true, createdBy: 'Lakshmi V', createdAt: now - 120 * DAY, lastRunAt: null, lastStatus: null },
    { id: 'SCH-2', templateId: 'gst', frequency: 'monthly', weekday: 1, dayOfMonth: 2, hour: 8, recipients: ['accounts@elab.com', 'ca.partner@sbcassociates.in'], active: true, createdBy: 'Fathima Rasheed', createdAt: now - 200 * DAY, lastRunAt: null, lastStatus: null },
    { id: 'SCH-3', templateId: 'churn', frequency: 'weekly', weekday: 5, dayOfMonth: 1, hour: 17, recipients: ['growth@elab.com'], active: true, createdBy: 'Lakshmi V', createdAt: now - 60 * DAY, lastRunAt: null, lastStatus: null },
    { id: 'SCH-4', templateId: 'institutions', frequency: 'monthly', weekday: 1, dayOfMonth: 1, hour: 10, recipients: ['sales@elab.com'], active: false, createdBy: 'Nikhil George', createdAt: now - 90 * DAY, lastRunAt: null, lastStatus: null },
  ];
  const runs: ReportRun[] = [];
  let serial = 2001;
  for (const schedule of schedules) {
    const step = schedule.frequency === 'weekly' ? 7 * DAY : 30 * DAY;
    let t = nextRun(schedule, now) - step;
    for (let i = 0; i < (schedule.frequency === 'weekly' ? 4 : 2) && t > schedule.createdAt; i += 1, t -= step) {
      if (!schedule.active && i === 0) continue;
      const range = TEMPLATE_MAP[schedule.templateId].snapshot ? null : scheduleRange(schedule.frequency);
      const [from, to] = range ? rangeBounds(range, t) : [t, t];
      const failed = schedule.id === 'SCH-3' && i === 1;
      runs.push({ id: `RUN-${serial++}`, templateId: schedule.templateId, range, from, to, requestedBy: `Schedule · ${cadenceLabel(schedule)}`, at: t + 2 * 60_000, status: failed ? 'failed' : 'ready', rows: 0, note: failed ? 'Mail server rejected one recipient — report not sent' : `Emailed to ${schedule.recipients.length} recipient${schedule.recipients.length === 1 ? '' : 's'}` });
      if (i === 0) {
        schedule.lastRunAt = t;
        schedule.lastStatus = failed ? 'failed' : 'ready';
      }
    }
  }
  runs.push({ id: `RUN-${serial++}`, templateId: 'content', range: null, from: now - 3 * DAY, to: now - 3 * DAY, requestedBy: 'Joel Thomas', at: now - 3 * DAY, status: 'ready', rows: 0, note: null });
  const [paidFrom, paidTo] = rangeBounds('30d', now - DAY);
  runs.push({ id: `RUN-${serial++}`, templateId: 'payments', range: '30d', from: paidFrom, to: paidTo, requestedBy: 'Fathima Rasheed', at: now - DAY - 5 * HOUR, status: 'ready', rows: 0, note: null });
  return { runs: runs.sort((a, b) => b.at - a.at), schedules };
}

function load(): ReportsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReportsState;
      if (Array.isArray(parsed?.runs) && Array.isArray(parsed?.schedules)) return parsed;
    }
  } catch {}
  return seed(Date.now());
}

function persist(state: ReportsState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  return state;
}

const nextId = (prefix: string, items: { id: string }[]) => `${prefix}-${Math.max(prefix === 'RUN' ? 2000 : 0, ...items.map((item) => Number(item.id.split('-')[1]) || 0)) + 1}`;

export function useReports() {
  const [state, setState] = useState<ReportsState | null>(null);
  const stateRef = useRef<ReportsState | null>(null);
  stateRef.current = state;
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setState(load());
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const commit = useCallback((fn: (current: ReportsState) => ReportsState) => setState((current) => (current ? persist(fn(current)) : current)), []);

  const generate = useCallback(
    (templateId: TemplateId, range: RangeId | null, rows: number, requestedBy: string = ME): string => {
      const now = Date.now();
      const [from, to] = range ? rangeBounds(range, now) : [now, now];
      const id = nextId('RUN', stateRef.current?.runs ?? []);
      const run: ReportRun = { id, templateId, range, from, to, requestedBy, at: now, status: 'generating', rows, note: null };
      commit((current) => ({ ...current, runs: [run, ...current.runs] }));
      const timer = window.setTimeout(() => commit((current) => ({ ...current, runs: current.runs.map((item) => (item.id === id ? { ...item, status: 'ready' } : item)) })), 1200);
      timers.current.push(timer);
      return id;
    },
    [commit],
  );

  const saveSchedule = useCallback(
    (input: ScheduleInput, id: string | null) =>
      commit((current) =>
        id
          ? { ...current, schedules: current.schedules.map((schedule) => (schedule.id === id ? { ...schedule, ...input } : schedule)) }
          : { ...current, schedules: [{ ...input, id: nextId('SCH', current.schedules), active: true, createdBy: ME, createdAt: Date.now(), lastRunAt: null, lastStatus: null }, ...current.schedules] },
      ),
    [commit],
  );

  const setActive = useCallback((id: string, active: boolean) => commit((current) => ({ ...current, schedules: current.schedules.map((schedule) => (schedule.id === id ? { ...schedule, active } : schedule)) })), [commit]);

  const removeSchedule = useCallback((id: string) => commit((current) => ({ ...current, schedules: current.schedules.filter((schedule) => schedule.id !== id) })), [commit]);

  const markRun = useCallback(
    (scheduleId: string, runId: string) =>
      commit((current) => ({
        ...current,
        schedules: current.schedules.map((schedule) => (schedule.id === scheduleId ? { ...schedule, lastRunAt: Date.now(), lastStatus: 'ready' } : schedule)),
        runs: current.runs.map((run) => (run.id === runId ? { ...run, note: `Sent now to ${current.schedules.find((schedule) => schedule.id === scheduleId)?.recipients.length ?? 0} recipients` } : run)),
      })),
    [commit],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setState(seed(Date.now()));
  }, []);

  return { runs: state?.runs ?? [], schedules: state?.schedules ?? [], loaded: state !== null, generate, saveSchedule, setActive, removeSchedule, markRun, reset };
}

export type ReportStore = ReturnType<typeof useReports>;
export { RANGE_LABEL };
