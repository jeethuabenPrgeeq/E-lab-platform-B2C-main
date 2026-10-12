'use client';

import { useMemo, useState } from 'react';
import { ArrowUp, Pause, Play, RotateCw, Search, X } from 'lucide-react';
import { useJudge } from '../lib/mock';
import { JOB_STATE, ago, cx, useNow } from '../lib/shared';
import type { JudgeJob } from '../lib/types';
import { JudgeHeader } from '../ui/JudgeHeader';
import styles from '../ui/judge.module.css';

const ORDER: Record<JudgeJob['state'], number> = { running: 0, queued: 1, failed: 2 };

function sortJobs(a: JudgeJob, b: JudgeJob) {
  if (a.state !== b.state) return ORDER[a.state] - ORDER[b.state];
  if (a.state === 'queued' && a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
  return a.queuedAt.localeCompare(b.queuedAt);
}

export default function QueuePage() {
  const { state, loaded, cancelJob, retryJob, prioritizeJob, retryAllFailed, togglePause, reset } = useJudge();
  const now = useNow();
  const [query, setQuery] = useState('');
  const [jobState, setJobState] = useState('');
  const [language, setLanguage] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const jobs = useMemo(() => state?.jobs ?? [], [state]);
  const workerName = (id: string) => state?.workers.find((worker) => worker.id === id)?.name ?? '—';
  const languages = useMemo(() => [...new Set(jobs.map((job) => job.language))].sort(), [jobs]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs
      .filter((job) => {
        if (jobState && job.state !== jobState) return false;
        if (language && job.language !== language) return false;
        if (q && !`${job.id} ${job.problem} ${job.learner}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort(sortJobs);
  }, [jobs, query, jobState, language]);

  const counts = useMemo(() => {
    const queued = jobs.filter((job) => job.state === 'queued');
    const oldest = queued.reduce((min, job) => (job.queuedAt < min ? job.queuedAt : min), '');
    return {
      queued: queued.length,
      running: jobs.filter((job) => job.state === 'running').length,
      failed: jobs.filter((job) => job.state === 'failed').length,
      oldest,
    };
  }, [jobs]);

  const online = state?.workers.some((worker) => worker.status === 'online') ?? true;
  const paused = state?.queuePaused ?? false;

  const timing = (job: JudgeJob) => {
    if (job.state === 'queued') return `waiting ${ago(job.queuedAt, now)}`;
    if (job.state === 'running') return `running ${ago(job.startedAt, now)}`;
    return `${ago(job.startedAt || job.queuedAt, now)} ago`;
  };

  return (
    <div className={styles.page}>
      <JudgeHeader subtitle="Submissions waiting for, or being run by, a judge worker" paused={paused} onReset={reset}>
        <button type="button" className={styles.ghostButton} onClick={retryAllFailed} disabled={counts.failed === 0}>
          <RotateCw width={16} height={16} aria-hidden="true" />
          {`Retry failed${counts.failed ? ` (${counts.failed})` : ''}`}
        </button>
        <button type="button" className={cx(styles.primaryButton, !paused && styles.dangerButton)} onClick={togglePause} disabled={!loaded}>
          {paused ? <Play width={16} height={16} aria-hidden="true" /> : <Pause width={16} height={16} aria-hidden="true" />}
          {paused ? 'Resume queue' : 'Pause queue'}
        </button>
      </JudgeHeader>

      <section className={cx(styles.stats, styles.stats4)} aria-label="Summary">
        {[
          { label: 'Queued', value: String(counts.queued) },
          { label: 'Running', value: String(counts.running) },
          { label: 'Failed', value: String(counts.failed) },
          { label: 'Longest wait', value: counts.oldest ? ago(counts.oldest, now) : '—' },
        ].map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <span className={styles.statValue}>{loaded ? stat.value : '—'}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </section>

      <div className={styles.card}>
        {loaded && paused && (
          <div className={styles.banner} role="status">
            <Pause width={18} height={18} aria-hidden="true" />
            <span>The queue is paused. Running jobs finish, but nothing new is picked up and no new submissions are accepted.</span>
          </div>
        )}
        {loaded && !paused && !online && (
          <div className={styles.banner} role="status">
            <X width={18} height={18} aria-hidden="true" />
            <span>No worker is online, so queued jobs can’t start. Start or resume a worker on the Workers tab.</span>
          </div>
        )}

        <div className={styles.toolbar}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input
              className={styles.input}
              placeholder="Search by job, problem or learner"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search jobs"
            />
          </div>
          <select className={styles.select} value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Filter by language">
            <option value="">All languages</option>
            {languages.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select className={styles.select} value={jobState} onChange={(event) => setJobState(event.target.value)} aria-label="Filter by state">
            <option value="">All states</option>
            {Object.entries(JOB_STATE).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {loaded && rows.length > 0 && <p className={styles.count}>{`${rows.length} job${rows.length === 1 ? '' : 's'}`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{jobs.length === 0 ? 'The queue is empty.' : 'No jobs match the current filters.'}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Problem</th>
                  <th>State</th>
                  <th>Priority</th>
                  <th>Worker</th>
                  <th>Time</th>
                  <th className={styles.actionsHead}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((job) => {
                  const meta = JOB_STATE[job.state];
                  return (
                    <tr key={job.id}>
                      <td>
                        <span className={cx(styles.primaryText, styles.monoText)}>{job.id}</span>
                        <span className={styles.slug}>{job.learner}</span>
                      </td>
                      <td className={styles.cell}>
                        <span className={styles.primaryText}>{job.problem}</span>
                        <span className={styles.subText}>{job.language}</span>
                      </td>
                      <td>
                        <span className={cx(styles.badge, styles[`tone_${meta.tone}`])}>{meta.label}</span>
                        {job.error && <span className={styles.errorLine}>{job.error}</span>}
                      </td>
                      <td>
                        {job.priority === 'high' ? (
                          <span className={styles.priorityHigh}>
                            <ArrowUp width={12} height={12} aria-hidden="true" />
                            High
                          </span>
                        ) : (
                          <span className={styles.muted}>Normal</span>
                        )}
                      </td>
                      <td className={cx(styles.cell, styles.monoText, !job.workerId && styles.muted)}>{workerName(job.workerId)}</td>
                      <td className={styles.date}>{timing(job)}</td>
                      <td>
                        {confirmId === job.id ? (
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={cx(styles.actionButton, styles.actionDanger)}
                              onClick={() => {
                                cancelJob(job.id);
                                setConfirmId(null);
                              }}
                            >
                              {job.state === 'failed' ? 'Remove' : 'Cancel job'}
                            </button>
                            <button type="button" className={cx(styles.actionButton, styles.actionBack)} onClick={() => setConfirmId(null)}>
                              Keep
                            </button>
                          </div>
                        ) : (
                          <div className={styles.actions}>
                            {job.state === 'queued' && (
                              <button
                                type="button"
                                className={cx(styles.iconButton, styles.iconWarn)}
                                aria-label={`Prioritise ${job.id}`}
                                title={job.priority === 'high' ? 'Already high priority' : 'Move to the front of the queue'}
                                disabled={job.priority === 'high'}
                                onClick={() => prioritizeJob(job.id)}
                              >
                                <ArrowUp width={15} height={15} aria-hidden="true" />
                              </button>
                            )}
                            {job.state === 'failed' && (
                              <button
                                type="button"
                                className={cx(styles.iconButton, styles.iconPrimary)}
                                aria-label={`Retry ${job.id}`}
                                title="Retry"
                                onClick={() => retryJob(job.id)}
                              >
                                <RotateCw width={15} height={15} aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              className={cx(styles.iconButton, styles.iconDanger)}
                              aria-label={`${job.state === 'failed' ? 'Remove' : 'Cancel'} ${job.id}`}
                              title={job.state === 'failed' ? 'Remove' : job.state === 'running' ? 'Stop and cancel' : 'Cancel'}
                              onClick={() => setConfirmId(job.id)}
                            >
                              <X width={15} height={15} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}