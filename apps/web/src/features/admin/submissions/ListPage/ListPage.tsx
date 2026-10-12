'use client';

import { useCallback, useMemo, useState } from 'react';
import { LoaderCircle, Search } from 'lucide-react';
import { LANGUAGES, PROBLEMS } from '../lib/data';
import { useFlags } from '../lib/flags';
import { DIFFICULTY_META, JUDGING_MS, VERDICTS, VERDICT_META, cx, formatAgo, formatMs } from '../lib/shared';
import { effectiveVerdict, useSubmissions } from '../lib/store';
import type { DisplayVerdict, Submission } from '../lib/types';
import { SubmissionDrawer } from '../SubmissionDrawer/SubmissionDrawer';
import { SubHeader } from '../ui/SubHeader';
import styles from '../ui/sub.module.css';

const PAGE = 50;

export default function ListPage() {
  const [live, setLive] = useState(true);
  const { snap, persist, rejudgeOne, reset } = useSubmissions(live);
  const flags = useFlags(snap, persist);
  const [query, setQuery] = useState('');
  const [verdict, setVerdict] = useState('');
  const [problem, setProblem] = useState('');
  const [language, setLanguage] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Submission | null>(null);

  const now = snap?.now ?? 0;
  const display = useCallback(
    (sub: Submission): DisplayVerdict => (now - sub.t < JUDGING_MS ? 'judging' : effectiveVerdict(sub, persist)),
    [now, persist],
  );

  const rows = useMemo(() => {
    if (!snap) return [];
    const q = query.trim().toLowerCase();
    const out: Submission[] = [];
    for (let i = snap.all.length - 1; i >= 0; i -= 1) {
      const sub = snap.all[i];
      if (problem && PROBLEMS[sub.problem].id !== problem) continue;
      if (language && LANGUAGES[sub.language].name !== language) continue;
      if (difficulty && PROBLEMS[sub.problem].difficulty !== difficulty) continue;
      if (verdict && display(sub) !== verdict) continue;
      if (q && !`${sub.id} ${sub.learner} ${PROBLEMS[sub.problem].title}`.toLowerCase().includes(q)) continue;
      out.push(sub);
    }
    return out;
  }, [snap, query, problem, language, difficulty, verdict, display]);

  const filtered = Boolean(query || verdict || problem || language || difficulty);
  const visible = rows.slice(0, limit);
  const filter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setLimit(PAGE);
  };

  return (
    <div className={styles.page}>
      <SubHeader
        subtitle="Every learner submission from the last 30 days, newest first"
        live={live}
        pending={flags.filter((item) => !item.decision).length}
        running={persist.jobs.some((job) => job.status === 'running')}
        onToggleLive={() => setLive((value) => !value)}
        onReset={() => {
          reset();
          setSelected(null);
        }}
      />

      <div className={styles.card}>
        <div className={cx(styles.toolbar, styles.toolbarLog)}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} width={16} height={16} aria-hidden="true" />
            <input
              className={styles.input}
              placeholder="Search by ID, learner or problem"
              value={query}
              onChange={(event) => filter(setQuery)(event.target.value)}
              aria-label="Search submissions"
            />
          </div>
          <select className={styles.select} value={verdict} onChange={(event) => filter(setVerdict)(event.target.value)} aria-label="Filter by verdict">
            <option value="">All verdicts</option>
            {VERDICTS.map((item) => (
              <option key={item} value={item}>
                {VERDICT_META[item].label}
              </option>
            ))}
          </select>
          <select className={styles.select} value={problem} onChange={(event) => filter(setProblem)(event.target.value)} aria-label="Filter by problem">
            <option value="">All problems</option>
            {PROBLEMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <select className={styles.select} value={language} onChange={(event) => filter(setLanguage)(event.target.value)} aria-label="Filter by language">
            <option value="">All languages</option>
            {LANGUAGES.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <select className={styles.select} value={difficulty} onChange={(event) => filter(setDifficulty)(event.target.value)} aria-label="Filter by difficulty">
            <option value="">All difficulties</option>
            {Object.entries(DIFFICULTY_META).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {snap && rows.length > 0 && (
          <p className={styles.count}>{`Showing ${visible.length} of ${rows.length.toLocaleString('en-IN')} submission${rows.length === 1 ? '' : 's'}${filtered ? ' matching filters' : ''}`}</p>
        )}

        {!snap ? (
          <div className={styles.empty}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>No submissions match the current filters.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={cx(styles.table, styles.logTable)}>
                <thead>
                  <tr>
                    <th>Submission</th>
                    <th>Problem</th>
                    <th>Learner</th>
                    <th className={styles.num}>Tests</th>
                    <th className={styles.num}>Time</th>
                    <th className={styles.num}>Memory</th>
                    <th>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((sub) => {
                    const shown = display(sub);
                    const meta = VERDICT_META[shown];
                    const p = PROBLEMS[sub.problem];
                    const done = shown !== 'judging';
                    const override = persist.overrides[sub.id];
                    return (
                      <tr key={sub.id} className={styles.clickRow} onClick={() => setSelected(sub)}>
                        <td>
                          <button
                            type="button"
                            className={styles.rowLink}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelected(sub);
                            }}
                          >
                            {sub.id}
                          </button>
                          <span className={styles.subText}>{`${formatAgo(sub.t, snap.now)} · attempt ${sub.attempt}`}</span>
                        </td>
                        <td className={styles.cell}>
                          <span className={styles.primaryText}>{p.title}</span>
                          <span className={styles.subText}>
                            <span className={styles[`text_${DIFFICULTY_META[p.difficulty].tone}`]}>{DIFFICULTY_META[p.difficulty].label}</span>
                            {` · ${LANGUAGES[sub.language].name}`}
                          </span>
                        </td>
                        <td className={cx(styles.cell, styles.monoText)}>{sub.learner}</td>
                        <td className={cx(styles.num, styles.cell)}>
                          {done ? `${shown === 'ac' ? sub.testsTotal : shown === 'ce' ? 0 : Math.min(sub.testsPassed, sub.testsTotal - 1)}/${sub.testsTotal}` : '—'}
                        </td>
                        <td className={cx(styles.num, styles.cell)}>{done && shown !== 'ce' ? formatMs(sub.runtimeMs) : '—'}</td>
                        <td className={cx(styles.num, styles.cell)}>{done && shown !== 'ce' ? `${sub.memoryMb} MB` : '—'}</td>
                        <td className={styles.cell}>
                          <span className={cx(styles.badge, styles[`tone_${meta.tone}`])}>
                            {!done && <LoaderCircle className={styles.spin} width={12} height={12} aria-hidden="true" />}
                            {meta.label}
                          </span>
                          {override && <span className={styles.subText}>{`Rejudged · was ${VERDICT_META[override.from].short}`}</span>}
                          {sub.similarity > 0 && done && <span className={styles.flagNote}>{`${sub.similarity}% similar`}</span>}
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

      {selected && (
        <SubmissionDrawer
          sub={selected}
          verdict={display(selected)}
          override={persist.overrides[selected.id] ?? null}
          onRejudge={rejudgeOne}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}