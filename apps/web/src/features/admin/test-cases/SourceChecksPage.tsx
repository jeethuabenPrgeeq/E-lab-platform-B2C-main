'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, LoaderCircle, Play } from 'lucide-react';
import { recalledProblem, rememberProblem, useCoverage, useProblemTests } from './api';
import type { CheckRun, CheckStatus } from './types';
import { capitalize, cx, DIFFICULTY_CLASS } from './shared';
import { TestCaseTabs } from './TestCaseTabs/TestCaseTabs';
import styles from './test-cases.module.css';

export function SourceChecksPage() {
  const { problems, ready, loadError } = useCoverage();
  const [checks, setChecks] = useState<Record<string, CheckRun>>({});
  const [technology, setTechnology] = useState('All');
  const [problemId, setProblemId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setProblemId(recalledProblem());
  }, []);

  const technologies = useMemo(() => ['All', ...Array.from(new Set(problems.map((problem) => problem.technology)))], [problems]);
  const filtered = useMemo(
    () => problems.filter((problem) => technology === 'All' || problem.technology === technology),
    [problems, technology],
  );
  const selected = filtered.find((problem) => problem.id === problemId) ?? filtered[0] ?? null;
  const { tests } = useProblemTests(selected?.id ?? null);

  const runCheck = useCallback(async (id: string) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const run: CheckRun = {
      problemId: id,
      checkedAt: new Date().toISOString(),
      results: tests.map((test) => {
        const status: CheckStatus = test.expectedOutput.trim() ? 'pass' : 'fail';
        return { testId: test.id, status, durationMs: 12 + ((test.expectedOutput.length * 7) % 60) };
      }),
    };
    setChecks((prev) => ({ ...prev, [id]: run }));
  }, [tests]);
  const run = selected ? checks[selected.id] : undefined;
  const resultById = useMemo(() => new Map((run?.results ?? []).map((result) => [result.testId, result])), [run]);
  const failed = run ? run.results.filter((result) => result.status === 'fail').length : 0;
  const ordered = selected ? [...tests].sort((a, b) => Number(a.hidden) - Number(b.hidden)) : [];

  const start = async () => {
    if (!selected || tests.length === 0) return;
    setBusy(true);
    try {
      await runCheck(selected.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Source Checks</h1>
          <p className={styles.subtitle}>Run the reference solution against every test case</p>
        </div>
      </header>

      <TestCaseTabs />

      <div className={styles.notice} role="note">
        <Info width={16} height={16} aria-hidden="true" />
        <span>Results are simulated. Running the reference solution on the judge is not connected yet.</span>
      </div>

      <section className={styles.filters} aria-label="Choose a problem">
        <label className={styles.field}>
          <span className={styles.label}>Technology</span>
          <select
            className={styles.control}
            value={technology}
            onChange={(event) => {
              setTechnology(event.target.value);
              setProblemId('');
            }}
          >
            {technologies.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Problem</span>
          <select
            className={styles.control}
            value={selected?.id ?? ''}
            disabled={filtered.length === 0 || busy}
            onChange={(event) => {
              setProblemId(event.target.value);
              rememberProblem(event.target.value);
            }}
          >
            {filtered.map((problem) => (
              <option key={problem.id} value={problem.id}>
                {problem.title}
              </option>
            ))}
          </select>
        </label>
      </section>

      {!ready ? (
        <p className={styles.empty}>Loading&hellip;</p>
      ) : loadError ? (
        <section className={styles.card}>
          <p className={styles.empty}>{loadError}</p>
        </section>
      ) : !selected ? (
        <section className={styles.card}>
          <p className={styles.empty}>No problems found for this technology.</p>
        </section>
      ) : (
        <section className={styles.card} aria-labelledby="sc-card-title">
          <div className={styles.cardHead}>
            <div>
              <h2 id="sc-card-title" className={styles.cardTitle}>
                {selected.title}
              </h2>
              <p className={styles.cardSub}>
                <span className={cx(styles.badge, DIFFICULTY_CLASS[selected.difficulty])}>{capitalize(selected.difficulty)}</span>
                <span>{selected.technology}</span>
                {!run ? (
                  <span className={cx(styles.badge, styles.badgeNeutral)}>Not run</span>
                ) : failed === 0 ? (
                  <span className={cx(styles.badge, styles.badgePass)}>{`All ${run.results.length} passed`}</span>
                ) : (
                  <span className={cx(styles.badge, styles.badgeFail)}>{`${failed} of ${run.results.length} failed`}</span>
                )}
                {run && <span>{`Checked ${new Date(run.checkedAt).toLocaleString()}`}</span>}
              </p>
            </div>
            <div className={styles.cardActions}>
              <button type="button" className={styles.primaryButton} disabled={busy || ordered.length === 0} onClick={start}>
                {busy ? (
                  <LoaderCircle className={styles.spin} width={16} height={16} aria-hidden="true" />
                ) : (
                  <Play width={16} height={16} aria-hidden="true" />
                )}
                {busy ? 'Running\u2026' : run ? 'Run again' : 'Run check'}
              </button>
            </div>
          </div>

          {ordered.length === 0 ? (
            <p className={styles.empty}>This problem has no test cases to check yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col" className={styles.numCell}>
                      #
                    </th>
                    <th scope="col">Type</th>
                    <th scope="col">Result</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((test, index) => {
                    const result = resultById.get(test.id);
                    return (
                      <tr key={test.id}>
                        <td className={styles.numCell}>{index + 1}</td>
                        <td>
                          <span className={cx(styles.badge, test.hidden ? styles.badgeHidden : styles.badgeSample)}>
                            {test.hidden ? 'Hidden' : 'Sample'}
                          </span>
                        </td>
                        <td>
                          {result ? (
                            <span className={cx(styles.badge, result.status === 'pass' ? styles.badgePass : styles.badgeFail)}>
                              {result.status === 'pass' ? 'Passed' : 'Failed'}
                            </span>
                          ) : (
                            '\u2014'
                          )}
                        </td>
                        <td>{result ? `${result.durationMs} ms` : '\u2014'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}