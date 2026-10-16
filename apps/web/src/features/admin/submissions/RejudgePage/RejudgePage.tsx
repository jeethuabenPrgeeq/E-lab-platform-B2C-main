'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Play, Square } from 'lucide-react';
import { usePermissionGate } from '../../permissions/PermissionsProvider';
import { PROBLEMS, brokenFrom } from '../lib/data';
import { useFlags } from '../lib/flags';
import { problemHealth } from '../lib/metrics';
import { VERDICT_META, cx, formatDateTime, formatNumber } from '../lib/shared';
import { inScope, jobProgress, useSubmissions } from '../lib/store';
import type { RejudgeJob, RejudgeScope, Verdict } from '../lib/types';
import { SubHeader } from '../ui/SubHeader';
import styles from '../ui/sub.module.css';

const SCOPES: { value: RejudgeScope; label: string }[] = [
  { value: 'all', label: 'All submissions' },
  { value: 'since', label: 'Since a date' },
  { value: 'failed', label: 'Only not accepted' },
];

const SCOPE_LABEL: Record<RejudgeScope, string> = { all: 'All', since: 'Since', failed: 'Not accepted' };

const toDateInput = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function Changes({ job }: { job: RejudgeJob }) {
  const entries = Object.entries(job.changes).sort((a, b) => b[1] - a[1]);
  if (job.status === 'running') return <span className={styles.muted}>In progress</span>;
  if (job.status === 'cancelled') return <span className={styles.muted}>Cancelled — nothing applied</span>;
  if (!entries.length) return <span className={styles.muted}>No verdicts changed</span>;
  return (
    <span className={styles.changeList}>
      {entries.map(([key, count]) => {
        const [from, to] = key.split('>') as [Verdict, Verdict];
        return (
          <span key={key} className={styles.changeChip}>
            <span className={styles[`text_${VERDICT_META[from].tone}`]}>{VERDICT_META[from].short}</span>
            {' → '}
            <span className={styles[`text_${VERDICT_META[to].tone}`]}>{VERDICT_META[to].short}</span>
            <strong>{formatNumber(count)}</strong>
          </span>
        );
      })}
    </span>
  );
}

export default function RejudgePage() {
  const judge = usePermissionGate('judge.manage');
  const [live, setLive] = useState(true);
  const { snap, persist, startJob, cancelJob, reset } = useSubmissions(live);
  const flags = useFlags(snap, persist);
  const [problem, setProblem] = useState(6);
  const [scope, setScope] = useState<RejudgeScope>('since');
  const [sinceDate, setSinceDate] = useState('');

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('problem');
    const index = PROBLEMS.findIndex((item) => item.id === id);
    if (index >= 0) setProblem(index);
    setSinceDate(toDateInput(brokenFrom(Date.now())));
  }, []);

  const since = scope === 'since' && sinceDate ? new Date(`${sinceDate}T00:00:00`).getTime() : null;
  const now = snap?.now ?? 0;

  const affected = useMemo(() => {
    if (!snap) return 0;
    let count = 0;
    for (const sub of snap.all) if (inScope(sub, problem, scope, since, now, persist)) count += 1;
    return count;
  }, [snap, problem, scope, since, now, persist]);

  const health = useMemo(() => (snap ? problemHealth(snap.all, snap.now, persist) : []), [snap, persist]);
  const broken = health.find((item) => item.index === problem)?.status === 'broken';
  const runningJob = persist.jobs.find((job) => job.status === 'running') ?? null;
  const sinceInvalid = scope === 'since' && (!since || since > now);

  return (
    <div className={styles.page}>
      <SubHeader
        subtitle="Re-run submissions against the current test cases and update their verdicts"
        live={live}
        pending={flags.filter((item) => !item.decision).length}
        running={Boolean(runningJob)}
        onToggleLive={() => setLive((value) => !value)}
        onReset={reset}
      />

      <div className={styles.rejudgeGrid}>
        <form
          className={styles.card}
          onSubmit={(event) => {
            event.preventDefault();
            if (!affected || runningJob || sinceInvalid) return;
            startJob(problem, scope, since);
          }}
        >
          <h2 className={styles.cardTitle}>New rejudge</h2>
          <div className={styles.formStack}>
            <label className={styles.field}>
              <span className={styles.label}>Problem</span>
              <select className={styles.select} value={problem} onChange={(event) => setProblem(Number(event.target.value))}>
                {PROBLEMS.map((item, index) => (
                  <option key={item.id} value={index}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className={styles.fieldset}>
              <legend className={styles.label}>Scope</legend>
              <div className={cx(styles.segmented, styles.segmentedFull)} role="radiogroup" aria-label="Scope">
                {SCOPES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={scope === item.value}
                    className={cx(styles.segment, scope === item.value && styles.segmentActive)}
                    onClick={() => setScope(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {scope === 'since' && (
              <label className={styles.field}>
                <span className={styles.label}>Submitted on or after</span>
                <input
                  type="date"
                  className={cx(styles.input, sinceInvalid && styles.inputError)}
                  value={sinceDate}
                  max={snap ? toDateInput(snap.now) : undefined}
                  onChange={(event) => setSinceDate(event.target.value)}
                  aria-invalid={sinceInvalid || undefined}
                />
                {sinceInvalid && <span className={styles.errorText}>Pick a date in the past</span>}
              </label>
            )}

            {broken && (
              <div className={cx(styles.banner, styles.bannerDanger, styles.bannerTight)}>
                <AlertTriangle width={18} height={18} aria-hidden="true" />
                <span>
                  Acceptance on this problem collapsed in the last 48 hours. Save the corrected test case in{' '}
                  <Link href="/test-cases" className={styles.inlineLink}>
                    Test Case Management
                  </Link>{' '}
                  before rejudging.
                </span>
              </div>
            )}

            <div className={styles.preview}>
              <span className={styles.previewValue}>{snap ? formatNumber(affected) : '—'}</span>
              <span className={styles.previewText}>
                {`submission${affected === 1 ? '' : 's'} will be rejudged · about ${Math.max(3, Math.ceil(affected / 80))} s`}
              </span>
            </div>

            <button type="submit" className={styles.primaryButton} disabled={!snap || !affected || Boolean(runningJob) || sinceInvalid || !judge.allowed} title={judge.title}>
              <Play width={16} height={16} aria-hidden="true" />
              {runningJob ? 'Another rejudge is running' : 'Start rejudge'}
            </button>
          </div>
        </form>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Current job</h2>
          {runningJob ? (
            (() => {
              const done = jobProgress(runningJob, now);
              const ratio = runningJob.total ? done / runningJob.total : 1;
              const left = Math.max(0, Math.ceil((runningJob.startedAt + runningJob.durationMs - now) / 1000));
              return (
                <div className={styles.formStack}>
                  <div>
                    <span className={styles.primaryText}>{PROBLEMS[runningJob.problem].title}</span>
                    <span className={styles.subText}>{`${runningJob.id} · ${SCOPE_LABEL[runningJob.scope]}${runningJob.since ? ` ${formatDateTime(runningJob.since)}` : ''}`}</span>
                  </div>
                  <div
                    className={styles.progressTrack}
                    role="progressbar"
                    aria-valuenow={Math.round(ratio * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Rejudge progress"
                  >
                    <div className={styles.progressFill} style={{ width: `${ratio * 100}%` }} />
                  </div>
                  <div className={styles.progressMeta}>
                    <span>{`${formatNumber(done)} / ${formatNumber(runningJob.total)} judged`}</span>
                    <span>{`${Math.round(ratio * 100)}% · ${left}s left`}</span>
                  </div>
                  <button type="button" className={styles.ghostButton} disabled={!judge.allowed} title={judge.title} onClick={() => cancelJob(runningJob.id)}>
                    <Square width={14} height={14} aria-hidden="true" />
                    Cancel
                  </button>
                </div>
              );
            })()
          ) : persist.jobs[0] ? (
            <div className={styles.formStack}>
              <div>
                <span className={styles.primaryText}>{`Last job · ${PROBLEMS[persist.jobs[0].problem].title}`}</span>
                <span className={styles.subText}>{`${persist.jobs[0].id} · finished ${persist.jobs[0].finishedAt ? formatDateTime(persist.jobs[0].finishedAt) : '—'}`}</span>
              </div>
              <Changes job={persist.jobs[0]} />
            </div>
          ) : (
            <div className={styles.empty}>No rejudge has run yet.</div>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>History</h2>
        {persist.jobs.length === 0 ? (
          <div className={styles.empty}>Jobs you run will appear here.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={cx(styles.table, styles.logTable)}>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Problem</th>
                  <th>Scope</th>
                  <th className={styles.num}>Submissions</th>
                  <th>Verdict changes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {persist.jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <span className={cx(styles.primaryText, styles.monoText)}>{job.id}</span>
                      <span className={styles.subText}>{formatDateTime(job.startedAt)}</span>
                    </td>
                    <td className={styles.cell}>{PROBLEMS[job.problem].title}</td>
                    <td className={styles.cell}>{job.since ? `Since ${formatDateTime(job.since)}` : SCOPE_LABEL[job.scope]}</td>
                    <td className={cx(styles.num, styles.cell)}>{formatNumber(job.total)}</td>
                    <td>
                      <Changes job={job} />
                    </td>
                    <td>
                      <span
                        className={cx(
                          styles.badge,
                          job.status === 'done' ? styles.tone_success : job.status === 'running' ? styles.tone_primary : styles.tone_neutral,
                        )}
                      >
                        {job.status === 'done' ? 'Done' : job.status === 'running' ? 'Running' : 'Cancelled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}