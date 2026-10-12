'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAlerts } from '../lib/alerts';
import { LANGUAGES, WORKERS } from '../lib/generator';
import { OUTCOMES, OUTCOME_META, cx, formatAgo, formatMs } from '../lib/shared';
import { resetMonitor, useMonitor } from '../lib/store';
import type { Execution } from '../lib/types';
import { ExecutionDrawer } from '../ExecutionDrawer/ExecutionDrawer';
import { MonitorHeader } from '../ui/MonitorHeader';
import styles from '../ui/monitor.module.css';

const PAGE = 50;

export default function LogPage() {
  const [live, setLive] = useState(true);
  const { snap, refresh } = useMonitor(live);
  const { firing, resetAcks } = useAlerts(snap);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [language, setLanguage] = useState('');
  const [outcome, setOutcome] = useState('');
  const [worker, setWorker] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Execution | null>(null);

  const recent = useMemo(() => snap?.recent ?? [], [snap]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recent.filter((item) => {
      if (kind && item.kind !== kind) return false;
      if (language && item.language !== language) return false;
      if (outcome && item.outcome !== outcome) return false;
      if (worker && item.worker !== worker) return false;
      if (q && !`${item.id} ${item.problem} ${item.learner}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [recent, query, kind, language, outcome, worker]);

  const filtered = Boolean(query || kind || language || outcome || worker);
  const visible = rows.slice(0, limit);

  const filter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setLimit(PAGE);
  };

  return (
    <div className={styles.page}>
      <MonitorHeader
        subtitle="Every run and submission executed in the last 20 minutes, newest first"
        live={live}
        firing={firing}
        onToggleLive={() => setLive((value) => !value)}
        onReset={() => {
          resetMonitor();
          resetAcks();
          refresh();
          setSelected(null);
        }}
      />

      <div className={styles.card}>
        <div className={cx(styles.toolbar, styles.toolbarLog)}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input
              className={styles.input}
              placeholder="Search by ID, problem or learner"
              value={query}
              onChange={(event) => filter(setQuery)(event.target.value)}
              aria-label="Search executions"
            />
          </div>
          <select className={styles.select} value={kind} onChange={(event) => filter(setKind)(event.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            <option value="run">Runs</option>
            <option value="submit">Submissions</option>
          </select>
          <select className={styles.select} value={language} onChange={(event) => filter(setLanguage)(event.target.value)} aria-label="Filter by language">
            <option value="">All languages</option>
            {LANGUAGES.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={outcome} onChange={(event) => filter(setOutcome)(event.target.value)} aria-label="Filter by outcome">
            <option value="">All outcomes</option>
            {OUTCOMES.map((item) => (
              <option key={item} value={item}>
                {OUTCOME_META[item].label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={worker} onChange={(event) => filter(setWorker)(event.target.value)} aria-label="Filter by worker">
            <option value="">All workers</option>
            {WORKERS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {snap && rows.length > 0 && (
          <p className={styles.count}>{`Showing ${visible.length} of ${rows.length} execution${rows.length === 1 ? '' : 's'}${filtered ? ' matching filters' : ''}`}</p>
        )}

        {!snap ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>{filtered ? 'No executions match the current filters.' : 'No executions in the last 20 minutes.'}</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={cx(styles.table, styles.logTable)}>
                <thead>
                  <tr>
                    <th>Execution</th>
                    <th>Problem</th>
                    <th>Learner</th>
                    <th>Worker</th>
                    <th>Time</th>
                    <th className={styles.num}>Memory</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => {
                    const meta = OUTCOME_META[item.outcome];
                    const ratio = Math.min(1, item.durationMs / item.timeLimitMs);
                    const ran = item.outcome !== 'ce' && item.outcome !== 'sandbox';
                    return (
                      <tr key={item.id} className={styles.clickRow} onClick={() => setSelected(item)}>
                        <td>
                          <button
                            type="button"
                            className={styles.rowLink}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelected(item);
                            }}
                          >
                            {item.id}
                          </button>
                          <span className={styles.subText}>
                            <span className={styles.kindTag} data-kind={item.kind}>
                              {item.kind === 'submit' ? 'Submit' : 'Run'}
                            </span>
                            {` · ${formatAgo(item.startedAt, snap.now)}`}
                          </span>
                        </td>
                        <td className={styles.cell}>
                          <span className={styles.primaryText}>{item.problem}</span>
                          <span className={styles.subText}>{item.language}</span>
                        </td>
                        <td className={cx(styles.cell, styles.monoText)}>{item.learner}</td>
                        <td className={cx(styles.cell, styles.monoText, item.outcome === 'sandbox' && styles.textDanger)}>{item.worker}</td>
                        <td className={styles.cell}>
                          {ran ? (
                            <>
                              <span className={styles.timeValue}>{formatMs(item.durationMs)}</span>
                              <span className={styles.timeTrack} aria-hidden="true">
                                <span
                                  className={cx(styles.barFill, ratio >= 1 ? styles.fill_danger : ratio >= 0.75 ? styles.fill_warning : styles.fill_success)}
                                  style={{ width: `${Math.max(2, ratio * 100)}%` }}
                                />
                              </span>
                            </>
                          ) : (
                            <span className={styles.muted}>—</span>
                          )}
                        </td>
                        <td className={cx(styles.num, styles.cell)}>{ran ? `${item.memoryMb} MB` : <span className={styles.muted}>—</span>}</td>
                        <td>
                          <span className={cx(styles.badge, styles[`tone_${meta.tone}`])}>{meta.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length > visible.length && (
              <div className={styles.more}>
                <button type="button" className={styles.ghostButton} onClick={() => setLimit((value) => value + PAGE)}>
                  {`Show ${Math.min(PAGE, rows.length - visible.length)} more`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && <ExecutionDrawer execution={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}