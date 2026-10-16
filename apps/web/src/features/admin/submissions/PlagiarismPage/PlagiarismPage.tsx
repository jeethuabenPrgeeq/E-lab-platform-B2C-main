'use client';

import { useMemo, useState } from 'react';
import { Check, Eye, Undo2, X } from 'lucide-react';
import { usePermissionGate } from '../../permissions/PermissionsProvider';
import { LANGUAGES, PROBLEMS } from '../lib/data';
import { useFlags, type FlagItem } from '../lib/flags';
import { cx, formatAgo } from '../lib/shared';
import { useSubmissions } from '../lib/store';
import { CompareModal } from '../CompareModal/CompareModal';
import { SubHeader } from '../ui/SubHeader';
import styles from '../ui/sub.module.css';

const PAGE = 20;

const STATUS_META = {
  pending: { label: 'Pending', tone: 'warning' },
  confirmed: { label: 'Plagiarism', tone: 'danger' },
  dismissed: { label: 'Dismissed', tone: 'neutral' },
} as const;

export default function PlagiarismPage() {
  const judge = usePermissionGate('judge.manage');
  const [live, setLive] = useState(true);
  const { snap, persist, decideFlag, reset } = useSubmissions(live);
  const flags = useFlags(snap, persist);
  const [status, setStatus] = useState('pending');
  const [problem, setProblem] = useState('');
  const [minScore, setMinScore] = useState('80');
  const [openId, setOpenId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const stateOf = (item: FlagItem) => item.decision?.decision ?? 'pending';

  const rows = useMemo(
    () =>
      flags.filter((item) => {
        if (status && stateOf(item) !== status) return false;
        if (problem && PROBLEMS[item.sub.problem].id !== problem) return false;
        if (item.sub.similarity < Number(minScore)) return false;
        return true;
      }),
    [flags, status, problem, minScore],
  );

  const pending = flags.filter((item) => !item.decision);
  const counts = {
    pending: pending.length,
    confirmed: flags.filter((item) => item.decision?.decision === 'confirmed').length,
    dismissed: flags.filter((item) => item.decision?.decision === 'dismissed').length,
    avg: pending.length ? Math.round(pending.reduce((sum, item) => sum + item.sub.similarity, 0) / pending.length) : 0,
  };
  const open = openId ? flags.find((item) => item.sub.id === openId) ?? null : null;

  return (
    <div className={styles.page}>
      <SubHeader
        subtitle="Accepted submissions that closely match an earlier learner’s code"
        live={live}
        pending={counts.pending}
        running={persist.jobs.some((job) => job.status === 'running')}
        onToggleLive={() => setLive((value) => !value)}
        onReset={() => {
          reset();
          setOpenId(null);
        }}
      />

      <section className={cx(styles.stats, styles.stats4)} aria-label="Summary">
        {[
          { label: 'Pending review', value: String(counts.pending), warn: counts.pending > 0 },
          { label: 'Confirmed', value: String(counts.confirmed) },
          { label: 'Dismissed', value: String(counts.dismissed) },
          { label: 'Avg similarity (pending)', value: counts.avg ? `${counts.avg}%` : '—' },
        ].map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <span className={cx(styles.statValue, stat.warn && styles.statWarn)}>{snap ? stat.value : '—'}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </section>

      <div className={styles.card}>
        <div className={cx(styles.toolbar, styles.toolbar3)}>
          <select className={styles.select} value={status} onChange={(event) => {
              setStatus(event.target.value);
              setLimit(PAGE);
            }} aria-label="Filter by status">
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed plagiarism</option>
            <option value="dismissed">Dismissed</option>
            <option value="">All statuses</option>
          </select>
          <select className={styles.select} value={problem} onChange={(event) => {
              setProblem(event.target.value);
              setLimit(PAGE);
            }} aria-label="Filter by problem">
            <option value="">All problems</option>
            {PROBLEMS.filter((item) => item.difficulty !== 'easy').map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <select className={styles.select} value={minScore} onChange={(event) => {
              setMinScore(event.target.value);
              setLimit(PAGE);
            }} aria-label="Minimum similarity">
            <option value="80">Similarity 80% +</option>
            <option value="90">Similarity 90% +</option>
            <option value="95">Similarity 95% +</option>
          </select>
        </div>

        {snap && rows.length > 0 && <p className={styles.count}>{`Showing ${Math.min(limit, rows.length)} of ${rows.length} flagged submission${rows.length === 1 ? '' : 's'}`}</p>}

        {!snap ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{status === 'pending' ? 'Nothing waiting for review.' : 'No flagged submissions match the current filters.'}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={cx(styles.table, styles.logTable)}>
              <thead>
                <tr>
                  <th>Flagged submission</th>
                  <th>Problem</th>
                  <th>Matches</th>
                  <th>Similarity</th>
                  <th>Status</th>
                  <th className={styles.actionsHead}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((item) => {
                  const state = stateOf(item);
                  const meta = STATUS_META[state];
                  const score = item.sub.similarity;
                  return (
                    <tr key={item.sub.id}>
                      <td>
                        <button type="button" className={styles.rowLink} onClick={() => setOpenId(item.sub.id)}>
                          {item.sub.id}
                        </button>
                        <span className={styles.subText}>{`${item.sub.learner} · ${formatAgo(item.sub.t, snap.now)}`}</span>
                      </td>
                      <td className={styles.cell}>
                        <span className={styles.primaryText}>{PROBLEMS[item.sub.problem].title}</span>
                        <span className={styles.subText}>{LANGUAGES[item.sub.language].name}</span>
                      </td>
                      <td className={styles.cell}>
                        <span className={styles.monoText}>{item.match.id}</span>
                        <span className={styles.subText}>{`${item.match.learner} · ${formatAgo(item.match.t, snap.now)}`}</span>
                      </td>
                      <td>
                        <div className={styles.meter}>
                          <div className={styles.meterTrack}>
                            <div className={cx(styles.meterFill, score >= 95 ? styles.fill_danger : styles.fill_warning)} style={{ width: `${score}%` }} />
                          </div>
                          <span className={styles.meterValue}>{`${score}%`}</span>
                        </div>
                      </td>
                      <td>
                        <span className={cx(styles.badge, styles[`tone_${meta.tone}`])}>{meta.label}</span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={cx(styles.iconButton, styles.iconPrimary)}
                            aria-label={`Compare ${item.sub.id} with ${item.match.id}`}
                            title="Compare code"
                            onClick={() => setOpenId(item.sub.id)}
                          >
                            <Eye width={15} height={15} aria-hidden="true" />
                          </button>
                          {item.decision ? (
                            <button
                              type="button"
                              className={styles.iconButton}
                              aria-label={`Undo decision on ${item.sub.id}`}
                              title={judge.title ?? 'Undo decision'}
                              disabled={!judge.allowed}
                              onClick={() => decideFlag(item.sub.id, null)}
                            >
                              <Undo2 width={15} height={15} aria-hidden="true" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={cx(styles.iconButton, styles.iconDanger)}
                                aria-label={`Confirm plagiarism on ${item.sub.id}`}
                                title={judge.title ?? 'Confirm plagiarism'}
                                disabled={!judge.allowed}
                                onClick={() => decideFlag(item.sub.id, 'confirmed')}
                              >
                                <Check width={15} height={15} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className={styles.iconButton}
                                aria-label={`Dismiss ${item.sub.id}`}
                                title={judge.title ?? 'Dismiss'}
                                disabled={!judge.allowed}
                                onClick={() => decideFlag(item.sub.id, 'dismissed')}
                              >
                                <X width={15} height={15} aria-hidden="true" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > limit && (
          <div className={styles.more}>
            <button type="button" className={styles.ghostButton} onClick={() => setLimit((value) => value + PAGE)}>
              {`Show ${Math.min(PAGE, rows.length - limit)} more`}
            </button>
          </div>
        )}
      </div>

      {open && (
        <CompareModal
          item={open}
          onDecide={(decision) => decideFlag(open.sub.id, decision)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}