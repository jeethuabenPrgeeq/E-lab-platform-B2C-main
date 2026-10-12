'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { recalledProblem, rememberProblem, useCoverage, useProblemTests } from './api';
import { capitalize, cx, DIFFICULTY_CLASS, MASK } from './shared';
import { TestCaseModal, type TestCaseDraft } from './TestCaseModal';
import type { TestCaseItem, Visibility } from './types';
import { TestCaseTabs } from './TestCaseTabs/TestCaseTabs';
import styles from './test-cases.module.css';

const COPY: Record<Visibility, { title: string; pill: string; subtitle: string; noun: string; empty: string }> = {
  sample: {
    title: 'Sample Tests',
    pill: 'Sample',
    subtitle: 'Shown to learners on the problem page',
    noun: 'sample test',
    empty: 'No sample tests yet. Learners need at least one example to understand the problem.',
  },
  hidden: {
    title: 'Hidden Tests',
    pill: 'Hidden',
    subtitle: 'Used for judging only and never shown to learners',
    noun: 'hidden test',
    empty: 'No hidden tests yet. Submissions cannot be judged without them.',
  },
};

export function TestCasePage({ visibility }: { visibility: Visibility }) {
  const isHidden = visibility === 'hidden';
  const copy = COPY[visibility];
  const { problems, ready, loadError, refresh: refreshCoverage } = useCoverage();
  const [technology, setTechnology] = useState('All');
  const [problemId, setProblemId] = useState('');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{ test: TestCaseItem | null } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [notice, setNotice] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);

  useEffect(() => {
    setProblemId(recalledProblem());
  }, []);

  const technologies = useMemo(() => ['All', ...Array.from(new Set(problems.map((problem) => problem.technology)))], [problems]);
  const filtered = useMemo(
    () => problems.filter((problem) => technology === 'All' || problem.technology === technology),
    [problems, technology],
  );
  const selected = filtered.find((problem) => problem.id === problemId) ?? filtered[0] ?? null;
  const { tests: allTests, loading, loadError: testsError, needsReason, addTest, updateTest, removeTest } = useProblemTests(selected?.id ?? null);
  const tests = allTests.filter((test) => test.hidden === isHidden);
  const allRevealed = tests.length > 0 && tests.every((test) => revealed.has(test.id));

  const selectProblem = (id: string) => {
    setProblemId(id);
    rememberProblem(id);
    setConfirmId(null);
    setNotice(null);
  };

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setRevealed((prev) => {
      const next = new Set(prev);
      tests.forEach((test) => (allRevealed ? next.delete(test.id) : next.add(test.id)));
      return next;
    });

  const show = (test: TestCaseItem, value: string) => (isHidden && !revealed.has(test.id) ? MASK : value || '\u2014');

  const submitModal = async (draft: TestCaseDraft, reason?: string) => {
    if (!selected || !modal) return 'Choose a problem first.';
    const result = modal.test ? await updateTest(modal.test.id, draft, reason) : await addTest({ ...draft, hidden: isHidden }, reason);
    if (!result.ok) return result.error;
    setModal(null);
    setNotice({ tone: 'ok', text: modal.test ? 'Test saved.' : `Added a ${copy.noun}.` });
    void refreshCoverage();
    return null;
  };

  const confirmDelete = async (test: TestCaseItem) => {
    if (needsReason && deleteReason.trim().length < 5) {
      setNotice({ tone: 'error', text: 'This problem is live. Give a reason of at least 5 characters to delete a test.' });
      return;
    }
    const result = await removeTest(test.id, needsReason ? deleteReason.trim() : undefined);
    setConfirmId(null);
    setDeleteReason('');
    setNotice(result.ok ? { tone: 'ok', text: 'Test deleted.' } : { tone: 'error', text: result.error });
    if (result.ok) void refreshCoverage();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>
      </header>

      <TestCaseTabs />

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
            disabled={filtered.length === 0}
            onChange={(event) => selectProblem(event.target.value)}
          >
            {filtered.map((problem) => (
              <option key={problem.id} value={problem.id}>
                {problem.title}
              </option>
            ))}
          </select>
        </label>
      </section>

      {notice && (
        <p className={notice.tone === 'error' ? styles.errorNotice : styles.okNotice} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      {!ready ? (
        <p className={styles.empty}>Loading&hellip;</p>
      ) : loadError ? (
        <section className={styles.card}>
          <p className={styles.empty}>{loadError}</p>
        </section>
      ) : !selected ? (
        <section className={styles.card}>
          <p className={styles.empty}>{problems.length === 0 ? 'No problems yet. Create one in Problem Management.' : 'No problems found for this technology.'}</p>
        </section>
      ) : (
        <section className={styles.card} aria-labelledby="tc-card-title">
          <div className={styles.cardHead}>
            <div>
              <h2 id="tc-card-title" className={styles.cardTitle}>
                {selected.title}
              </h2>
              <p className={styles.cardSub}>
                <span className={cx(styles.badge, DIFFICULTY_CLASS[selected.difficulty])}>{capitalize(selected.difficulty)}</span>
                <span>{selected.technology}</span>
                <span>{`${tests.length} ${copy.noun}${tests.length === 1 ? '' : 's'}`}</span>
                {needsReason && <span className={cx(styles.badge, styles.badgeWarn)}>Live: changes need a reason</span>}
              </p>
            </div>
            <div className={styles.cardActions}>
              {isHidden && tests.length > 0 && (
                <button type="button" className={styles.secondaryButton} onClick={toggleAll}>
                  {allRevealed ? <EyeOff width={16} height={16} aria-hidden="true" /> : <Eye width={16} height={16} aria-hidden="true" />}
                  {allRevealed ? 'Hide all' : 'Reveal all'}
                </button>
              )}
              <button type="button" className={styles.primaryButton} onClick={() => setModal({ test: null })}>
                <Plus width={16} height={16} aria-hidden="true" />
                {`Add ${copy.noun}`}
              </button>
            </div>
          </div>

          {loading && allTests.length === 0 ? (
            <p className={styles.empty}>Loading&hellip;</p>
          ) : testsError ? (
            <p className={styles.empty}>{testsError}</p>
          ) : tests.length === 0 ? (
            <p className={styles.empty}>{copy.empty}</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col" className={styles.numCell}>
                      #
                    </th>
                    <th scope="col">Input</th>
                    <th scope="col">Expected output</th>
                    <th scope="col" className={styles.actionsCell}>
                      <span className={styles.srOnly}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test, index) => (
                    <tr key={test.id}>
                      <td className={styles.numCell}>
                        {index + 1}
                        {!test.enabled && <div className={styles.hint}>off</div>}
                      </td>
                      <td>
                        <pre className={styles.code}>{show(test, test.input)}</pre>
                      </td>
                      <td>
                        <pre className={styles.code}>{show(test, test.expectedOutput)}</pre>
                      </td>
                      <td className={styles.actionsCell}>
                        {confirmId === test.id ? (
                          <span className={styles.rowActions}>
                            {needsReason && (
                              <input
                                className={styles.control}
                                style={{ width: 200 }}
                                placeholder="Reason (required)"
                                aria-label="Reason for deleting"
                                value={deleteReason}
                                onChange={(event) => setDeleteReason(event.target.value)}
                              />
                            )}
                            <button type="button" className={styles.dangerButton} onClick={() => confirmDelete(test)}>
                              Delete
                            </button>
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() => {
                                setConfirmId(null);
                                setDeleteReason('');
                              }}
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className={styles.rowActions}>
                            {isHidden && (
                              <button
                                type="button"
                                className={styles.iconButton}
                                aria-label={revealed.has(test.id) ? `Hide test ${index + 1}` : `Reveal test ${index + 1}`}
                                onClick={() => toggleReveal(test.id)}
                              >
                                {revealed.has(test.id) ? <EyeOff width={20} height={20} aria-hidden="true" /> : <Eye width={20} height={20} aria-hidden="true" />}
                              </button>
                            )}
                            <button
                              type="button"
                              className={styles.iconButton}
                              aria-label={`Edit test ${index + 1}`}
                              onClick={() => setModal({ test })}
                            >
                              <Pencil width={20} height={20} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={cx(styles.iconButton, styles.iconButtonDanger)}
                              aria-label={`Delete test ${index + 1}`}
                              onClick={() => setConfirmId(test.id)}
                            >
                              <Trash2 width={20} height={20} aria-hidden="true" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {modal && (
        <TestCaseModal
          key={modal.test?.id ?? 'new'}
          visibility={visibility}
          initial={modal.test}
          needsReason={needsReason}
          onCancel={() => setModal(null)}
          onSubmit={submitModal}
        />
      )}
    </div>
  );
}