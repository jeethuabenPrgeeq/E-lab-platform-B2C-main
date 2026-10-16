'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { rememberProblem, useCoverage } from './api';
import { capitalize, cx, DIFFICULTY_CLASS } from './shared';
import { TestCaseTabs } from './TestCaseTabs/TestCaseTabs';
import styles from './test-case-preparation.module.css';

export function OverviewPage() {
  const { problems, ready, loadError } = useCoverage();
  const [technology, setTechnology] = useState('All');

  const technologies = useMemo(() => ['All', ...Array.from(new Set(problems.map((problem) => problem.technology)))], [problems]);
  const rows = useMemo(
    () => problems.filter((problem) => technology === 'All' || problem.technology === technology),
    [problems, technology],
  );

  const totals = useMemo(() => {
    let noSample = 0;
    let noHidden = 0;
    let tests = 0;
    for (const problem of rows) {
      if (problem.sampleTests === 0) noSample += 1;
      if (problem.hiddenTests === 0) noHidden += 1;
      tests += problem.sampleTests + problem.hiddenTests;
    }
    return { noSample, noHidden, tests };
  }, [rows]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Test Case Preparation</h1>
          <p className={styles.subtitle}>Sample and hidden test coverage for every problem</p>
        </div>
      </header>

      <TestCaseTabs />

      <section className={styles.filters} aria-label="Filter problems">
        <label className={styles.field}>
          <span className={styles.label}>Technology</span>
          <select className={styles.control} value={technology} onChange={(event) => setTechnology(event.target.value)}>
            {technologies.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.statCard}>
          <span className={styles.statValue}>{rows.length}</span>
          <span className={styles.statLabel}>Problems</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totals.tests}</span>
          <span className={styles.statLabel}>Total test cases</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totals.noSample}</span>
          <span className={styles.statLabel}>Without sample tests</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totals.noHidden}</span>
          <span className={styles.statLabel}>Without hidden tests</span>
        </div>
      </section>

      <section className={styles.card} aria-label="Problems">
        {!ready ? (
          <p className={styles.empty}>Loading&hellip;</p>
        ) : loadError ? (
          <p className={styles.empty}>{loadError}</p>
        ) : rows.length === 0 ? (
          <p className={styles.empty}>{problems.length === 0 ? 'No problems found. Add problems through Upload Content.' : 'No problems found for this technology.'}</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Problem</th>
                  <th scope="col">Technology</th>
                  <th scope="col">Difficulty</th>
                  <th scope="col">Sample</th>
                  <th scope="col">Hidden</th>
                  <th scope="col">Coverage</th>
                  <th scope="col" className={styles.actionsCell}>
                    <span className={styles.srOnly}>Manage</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((problem) => {
                  const counts = { sample: problem.sampleTests, hidden: problem.hiddenTests };
                  const complete = counts.sample > 0 && counts.hidden > 0;
                  return (
                    <tr key={problem.id}>
                      <td>
                        <strong>{problem.title}</strong>
                        <div className={styles.hint}>{problem.slug}</div>
                      </td>
                      <td>{problem.technology}</td>
                      <td>
                        <span className={cx(styles.badge, DIFFICULTY_CLASS[problem.difficulty])}>{capitalize(problem.difficulty)}</span>
                      </td>
                      <td>{counts.sample}</td>
                      <td>{counts.hidden}</td>
                      <td>
                        {complete ? (
                          <span className={cx(styles.badge, styles.badgeOk)}>Complete</span>
                        ) : (
                          <span className={cx(styles.badge, styles.badgeWarn)}>
                            {counts.sample === 0 && counts.hidden === 0 ? 'No tests' : counts.sample === 0 ? 'No sample tests' : 'No hidden tests'}
                          </span>
                        )}
                      </td>
                      <td className={styles.actionsCell}>
                        <span className={styles.rowActions}>
                          <Link href="/test-case-preparation/sample" className={styles.linkButton} onClick={() => rememberProblem(problem.id)}>
                            Sample
                          </Link>
                          <Link href="/test-case-preparation/hidden" className={styles.linkButton} onClick={() => rememberProblem(problem.id)}>
                            Hidden
                          </Link>
                          <Link href="/test-case-preparation/source-checks" className={styles.linkButton} onClick={() => rememberProblem(problem.id)}>
                            Checks
                          </Link>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}