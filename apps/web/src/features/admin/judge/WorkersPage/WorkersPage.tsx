'use client';

import { useMemo, useState } from 'react';
import { Pause, Pencil, Play, Plus, Power, RotateCw, Search, Trash2 } from 'lucide-react';
import { useJudge } from '../lib/mock';
import { WORKER_STATUS, ago, cx, useNow } from '../lib/shared';
import type { JudgeWorker, WorkerInput } from '../lib/types';
import { JudgeHeader } from '../ui/JudgeHeader';
import { Meter } from '../ui/Meter';
import { WorkerModal } from '../WorkerModal/WorkerModal';
import styles from '../ui/judge.module.css';

export default function WorkersPage() {
  const { state, loaded, addWorker, updateWorker, removeWorker, toggleDrain, restartWorker, reset } = useJudge();
  const now = useNow();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState<{ item: JudgeWorker | null } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const workers = useMemo(() => state?.workers ?? [], [state]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workers.filter((worker) => {
      if (status && worker.status !== status) return false;
      if (q && !`${worker.name} ${worker.host} ${worker.version}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [workers, query, status]);

  const stats = useMemo(() => {
    const online = workers.filter((worker) => worker.status === 'online');
    const active = workers.filter((worker) => worker.status === 'online' || worker.status === 'draining');
    const capacity = online.reduce((sum, worker) => sum + worker.capacity, 0);
    const running = workers.reduce((sum, worker) => sum + worker.running, 0);
    const avgCpu = active.length ? Math.round(active.reduce((sum, worker) => sum + worker.cpu, 0) / active.length) : 0;
    return [
      { label: 'Workers online', value: `${online.length} / ${workers.length}` },
      { label: 'Slots in use', value: `${running} / ${capacity}` },
      { label: 'Running jobs', value: String(running) },
      { label: 'Average CPU', value: `${avgCpu}%` },
    ];
  }, [workers]);

  const submit = (input: WorkerInput) => {
    if (modal?.item) updateWorker(modal.item.id, input);
    else addWorker(input);
    setModal(null);
  };

  return (
    <div className={styles.page}>
      <JudgeHeader subtitle="Judge nodes that compile and run learner submissions" paused={state?.queuePaused} onReset={reset}>
        <button type="button" className={styles.primaryButton} onClick={() => setModal({ item: null })}>
          <Plus width={16} height={16} aria-hidden="true" />
          Add worker
        </button>
      </JudgeHeader>

      <section className={cx(styles.stats, styles.stats4)} aria-label="Summary">
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <span className={styles.statValue}>{loaded ? stat.value : '—'}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </section>

      <div className={styles.card}>
        <div className={styles.toolbar} data-filters={0}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input
              className={styles.input}
              placeholder="Search by name, host or version"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search workers"
            />
          </div>
          <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {Object.entries(WORKER_STATUS).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {loaded && rows.length > 0 && <p className={styles.count}>{`${rows.length} worker${rows.length === 1 ? '' : 's'}`}</p>}

        {!loaded ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{workers.length === 0 ? 'No workers yet. Add one to start judging.' : 'No workers match the current filters.'}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Status</th>
                  <th>Load</th>
                  <th>CPU</th>
                  <th>Memory</th>
                  <th>Heartbeat</th>
                  <th className={styles.actionsHead}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((worker) => {
                  const meta = WORKER_STATUS[worker.status];
                  const down = worker.status === 'offline' || worker.status === 'restarting';
                  const draining = worker.status === 'draining';
                  return (
                    <tr key={worker.id}>
                      <td>
                        <span className={cx(styles.primaryText, styles.monoText)}>{worker.name}</span>
                        <span className={styles.slug}>{`${worker.host} · v${worker.version}`}</span>
                      </td>
                      <td>
                        <span className={cx(styles.badge, styles[`tone_${meta.tone}`])}>{meta.label}</span>
                      </td>
                      <td className={styles.cell}>
                        <span>{`${worker.running} / ${worker.capacity}`}</span>
                        <div className={styles.slots} aria-hidden="true">
                          {Array.from({ length: Math.min(worker.capacity, 16) }, (_, index) => (
                            <span key={index} className={cx(styles.slot, index < worker.running && styles.slotOn)} />
                          ))}
                        </div>
                      </td>
                      <td>
                        <Meter value={worker.cpu} label={`${worker.name} CPU`} off={down} />
                      </td>
                      <td>
                        <Meter value={worker.memory} label={`${worker.name} memory`} off={down} />
                      </td>
                      <td className={cx(styles.date, worker.status === 'offline' && styles.actionDanger)}>{`${ago(worker.heartbeatAt, now)} ago`}</td>
                      <td>
                        {confirmId === worker.id ? (
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={cx(styles.actionButton, styles.actionDanger)}
                              onClick={() => {
                                removeWorker(worker.id);
                                setConfirmId(null);
                              }}
                            >
                              {worker.running > 0 ? `Delete & requeue ${worker.running}` : 'Delete'}
                            </button>
                            <button type="button" className={cx(styles.actionButton, styles.actionBack)} onClick={() => setConfirmId(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={cx(styles.iconButton, draining ? styles.iconSuccess : styles.iconWarn)}
                              aria-label={`${draining ? 'Resume' : 'Drain'} ${worker.name}`}
                              title={down ? 'Worker is not running' : draining ? 'Resume — accept new jobs' : 'Drain — finish current jobs, take no new ones'}
                              disabled={down}
                              onClick={() => toggleDrain(worker.id)}
                            >
                              {draining ? <Play width={15} height={15} aria-hidden="true" /> : <Pause width={15} height={15} aria-hidden="true" />}
                            </button>
                            <button
                              type="button"
                              className={cx(styles.iconButton, worker.status === 'offline' ? styles.iconSuccess : styles.iconPrimary)}
                              aria-label={`${worker.status === 'offline' ? 'Start' : 'Restart'} ${worker.name}`}
                              title={
                                worker.status === 'restarting'
                                  ? 'Restarting…'
                                  : worker.status === 'offline'
                                    ? 'Start worker'
                                    : worker.running > 0
                                      ? `Restart — ${worker.running} running jobs go back to the queue`
                                      : 'Restart'
                              }
                              disabled={worker.status === 'restarting'}
                              onClick={() => restartWorker(worker.id)}
                            >
                              {worker.status === 'offline' ? (
                                <Power width={15} height={15} aria-hidden="true" />
                              ) : (
                                <RotateCw className={worker.status === 'restarting' ? styles.spin : undefined} width={15} height={15} aria-hidden="true" />
                              )}
                            </button>
                            <button
                              type="button"
                              className={styles.iconButton}
                              aria-label={`Edit ${worker.name}`}
                              title="Edit"
                              disabled={worker.status === 'restarting'}
                              onClick={() => setModal({ item: worker })}
                            >
                              <Pencil width={15} height={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={cx(styles.iconButton, styles.iconDanger)}
                              aria-label={`Delete ${worker.name}`}
                              title="Delete"
                              onClick={() => setConfirmId(worker.id)}
                            >
                              <Trash2 width={15} height={15} aria-hidden="true" />
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

      {modal && state && (
        <WorkerModal key={modal.item?.id ?? 'new'} initial={modal.item} workers={state.workers} onCancel={() => setModal(null)} onSubmit={submit} />
      )}
    </div>
  );
}