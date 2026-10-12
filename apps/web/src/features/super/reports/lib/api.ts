'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, adminDownload, errorText } from '@/features/admin/lib/api';
import { fetchAll } from '../../lib/server-collection';
import type { ReportRun, Schedule, ScheduleInput } from './data';
import { iso, type RangeId, type TemplateId } from './templates';

export { RANGE_LABEL, WEEKDAYS, cadenceLabel, nextRun, scheduleRange, type Frequency, type ReportRun, type RunStatus, type Schedule, type ScheduleInput } from './data';

const POLL_MS = 3_000;

export function useReports() {
  const [runs, setRuns] = useState<ReportRun[] | null>(null);
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [error, setError] = useState('');
  const timer = useRef<number | null>(null);

  const loadRuns = useCallback(async () => setRuns(await fetchAll<ReportRun>('/super/reports/runs')), []);
  const loadSchedules = useCallback(async () => setSchedules((await adminApi<{ items: Schedule[] }>('/super/reports/schedules')).items), []);

  const refresh = useCallback(async () => {
    try {
      await Promise.all([loadRuns(), loadSchedules()]);
      setError('');
    } catch (err) {
      setError(errorText(err));
      setRuns((current) => current ?? []);
      setSchedules((current) => current ?? []);
    }
  }, [loadRuns, loadSchedules]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!runs?.some((run) => run.status === 'generating')) return;
    timer.current = window.setTimeout(() => void loadRuns().catch(() => {}), POLL_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [runs, loadRuns]);

  const addRun = (run: ReportRun) => setRuns((current) => [run, ...(current ?? []).filter((item) => item.id !== run.id)]);
  const putSchedule = (schedule: Schedule) =>
    setSchedules((current) => {
      const list = current ?? [];
      return list.some((item) => item.id === schedule.id) ? list.map((item) => (item.id === schedule.id ? schedule : item)) : [schedule, ...list];
    });

  const guard = useCallback(async <T,>(run: () => Promise<T>): Promise<T | null> => {
    try {
      const value = await run();
      setError('');
      return value;
    } catch (err) {
      setError(errorText(err));
      return null;
    }
  }, []);

  const generate = useCallback(
    async (templateId: TemplateId, range: RangeId | null) => {
      const run = await guard(() => adminApi<ReportRun>('/super/reports/runs', { method: 'POST', body: range ? { templateId, range } : { templateId } }));
      if (run) addRun(run);
      return run?.id ?? null;
    },
    [guard],
  );

  const saveSchedule = useCallback(
    async (input: ScheduleInput, id: string | null) => {
      const saved = await guard(() => adminApi<Schedule>(id ? `/super/reports/schedules/${id}` : '/super/reports/schedules', { method: id ? 'PATCH' : 'POST', body: input }));
      if (saved) putSchedule(saved);
      return Boolean(saved);
    },
    [guard],
  );

  const setActive = useCallback(
    async (id: string, active: boolean) => {
      const saved = await guard(() => adminApi<Schedule>(`/super/reports/schedules/${id}/active`, { method: 'POST', body: { active } }));
      if (saved) putSchedule(saved);
      return Boolean(saved);
    },
    [guard],
  );

  const removeSchedule = useCallback(
    async (id: string) => {
      const done = await guard(() => adminApi<{ deleted: boolean }>(`/super/reports/schedules/${id}`, { method: 'DELETE' }));
      if (done) setSchedules((current) => (current ?? []).filter((item) => item.id !== id));
      return Boolean(done);
    },
    [guard],
  );

  const runSchedule = useCallback(
    async (id: string) => {
      const run = await guard(() => adminApi<ReportRun>(`/super/reports/schedules/${id}/run`, { method: 'POST', body: {} }));
      if (run) {
        addRun(run);
        void loadSchedules().catch(() => {});
      }
      return run;
    },
    [guard, loadSchedules],
  );

  const download = useCallback(
    (run: ReportRun) => guard(() => adminDownload(`/super/reports/runs/${run.id}/download`, `elab-${run.templateId}-${iso(run.from)}${run.range ? `-to-${iso(run.to)}` : ''}.csv`)),
    [guard],
  );

  return {
    runs: runs ?? [],
    schedules: schedules ?? [],
    loaded: runs !== null && schedules !== null,
    error,
    clearError: () => setError(''),
    refresh,
    generate,
    saveSchedule,
    setActive,
    removeSchedule,
    runSchedule,
    download,
  };
}

export type ReportStore = ReturnType<typeof useReports>;
