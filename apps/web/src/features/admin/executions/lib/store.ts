'use client';

import { useEffect, useState } from 'react';
import { advanceStore, createStore, type MonitorStore } from './generator';
import type { MonitorSnapshot } from './types';

const TICK_MS = 3000;

let store: MonitorStore | null = null;

function snapshot(): MonitorSnapshot {
  const now = Date.now();
  if (!store) store = createStore(now);
  else advanceStore(store, now);
  return { minutes: store.minutes.slice(), recent: store.recent.slice().reverse(), now, epoch: store.epoch };
}

export function resetMonitor() {
  store = null;
}

export function useMonitor(live: boolean) {
  const [snap, setSnap] = useState<MonitorSnapshot | null>(null);

  useEffect(() => {
    setSnap(snapshot());
  }, []);

  useEffect(() => {
    if (!live) return;
    setSnap(snapshot());
    const id = window.setInterval(() => setSnap(snapshot()), TICK_MS);
    return () => window.clearInterval(id);
  }, [live]);

  return { snap, refresh: () => setSnap(snapshot()) };
}