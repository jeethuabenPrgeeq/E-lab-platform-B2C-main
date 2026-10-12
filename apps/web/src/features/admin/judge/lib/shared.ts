import { useEffect, useState } from 'react';
import type { JobState, WorkerStatus } from './types';

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export const WORKER_STATUS: Record<WorkerStatus, { label: string; tone: string }> = {
  online: { label: 'Online', tone: 'success' },
  draining: { label: 'Draining', tone: 'warning' },
  restarting: { label: 'Restarting', tone: 'primary' },
  offline: { label: 'Offline', tone: 'danger' },
};

export const JOB_STATE: Record<JobState, { label: string; tone: string }> = {
  queued: { label: 'Queued', tone: 'neutral' },
  running: { label: 'Running', tone: 'primary' },
  failed: { label: 'Failed', tone: 'danger' },
};

export function ago(iso: string, now = Date.now()) {
  if (!iso) return '—';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function meterTone(value: number) {
  if (value >= 85) return 'danger';
  if (value >= 65) return 'warning';
  return 'success';
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}