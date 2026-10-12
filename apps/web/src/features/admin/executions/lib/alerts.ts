'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ALERT_RULES, alertHistory, breaches, completeMinutes } from './metrics';
import type { AlertEvent, AlertRule, MonitorSnapshot } from './types';

const KEY = 'elab_exec_alerts_v1';

type AckMap = Record<string, { ackedEvent?: number; silencedUntil?: number }>;

export type RuleState = 'firing' | 'acknowledged' | 'silenced' | 'ok';

export interface RuleStatus {
  rule: AlertRule;
  value: number;
  breaching: boolean;
  state: RuleState;
  event: AlertEvent | null;
  silencedUntil: number | null;
}

function read(): AckMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AckMap) : {};
  } catch {
    return {};
  }
}

export function useAlerts(snap: MonitorSnapshot | null) {
  const [acks, setAcks] = useState<AckMap>({});

  useEffect(() => {
    setAcks(read());
  }, []);

  const write = useCallback((fn: (current: AckMap) => AckMap) => {
    setAcks((current) => {
      const next = fn(current);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const latest = useRef(snap);
  latest.current = snap;
  const end = snap ? Math.floor(snap.now / 60_000) * 60_000 : 0;
  const epoch = snap?.epoch ?? 0;

  const history = useMemo(() => {
    const current = latest.current;
    if (!end || !current) return null;
    return alertHistory(completeMinutes(current.minutes, current.now), end);
  }, [end, epoch]);

  const statuses = useMemo<RuleStatus[]>(() => {
    if (!history || !snap) return [];
    return ALERT_RULES.map((rule) => {
      const value = history.current[rule.id] ?? 0;
      const breaching = breaches(rule, value);
      const event = history.events.find((item) => item.ruleId === rule.id && item.resolvedAt === null) ?? null;
      const ack = acks[rule.id];
      const silencedUntil = ack?.silencedUntil && ack.silencedUntil > snap.now ? ack.silencedUntil : null;
      let state: RuleState = 'ok';
      if (event) state = silencedUntil ? 'silenced' : ack?.ackedEvent === event.startedAt ? 'acknowledged' : 'firing';
      else if (silencedUntil) state = 'silenced';
      return { rule, value, breaching, state, event, silencedUntil };
    });
  }, [history, acks, snap]);

  const acknowledge = useCallback(
    (ruleId: string, eventStart: number) => write((current) => ({ ...current, [ruleId]: { ...current[ruleId], ackedEvent: eventStart } })),
    [write],
  );

  const silence = useCallback(
    (ruleId: string, minutes: number) =>
      write((current) => ({ ...current, [ruleId]: { ...current[ruleId], silencedUntil: Date.now() + minutes * 60_000 } })),
    [write],
  );

  const unsilence = useCallback(
    (ruleId: string) => write((current) => ({ ...current, [ruleId]: { ...current[ruleId], silencedUntil: undefined } })),
    [write],
  );

  const resetAcks = useCallback(() => write(() => ({})), [write]);

  return {
    statuses,
    events: history?.events ?? [],
    firing: statuses.filter((status) => status.state === 'firing').length,
    acknowledge,
    silence,
    unsilence,
    resetAcks,
  };
}