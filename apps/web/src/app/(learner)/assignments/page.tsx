'use client';

import { ArrowLeft, Building2, ClipboardList, Layers3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ProblemList from '@/components/problems/ProblemList';
import { useSession } from '@/features/auth/useSession';
import { syncServerProgress, toPracticeProblem, useLearnerBatches } from '@/features/learner/api';
import { getSolvedProblemSlugs } from '@/features/progress/local-progress';
import styles from '../practice/[technologySlug]/practice.module.css';

const LEARNER_ONLY = ['learner'] as const;

export default function AssignmentsPage() {
  const router = useRouter();
  const session = useSession(LEARNER_ONLY);
  const { loaded, error, institution, items } = useLearnerBatches();
  const [solved, setSolved] = useState<string[]>([]);

  useEffect(() => {
    setSolved(getSolvedProblemSlugs());
    void syncServerProgress().then(() => setSolved(getSolvedProblemSlugs()));
  }, []);

  const totals = useMemo(() => {
    const slugs = new Set(items.flatMap((batch) => batch.problems.map((problem) => problem.slug)));
    const done = [...slugs].filter((slug) => solved.includes(slug)).length;
    return { problems: slugs.size, solved: done, progress: slugs.size ? Math.round((done / slugs.size) * 100) : 0 };
  }, [items, solved]);

  if (!session) return null;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <button type="button" className={styles.backButton} onClick={() => router.push('/dashboard')}>
          <ArrowLeft />
          Dashboard
        </button>

        <section className={styles.hero}>
          <div className={styles.heroIcon}>
            <ClipboardList />
          </div>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>{institution ? `Assigned by ${institution.name}` : 'Assignments'}</span>
            <h1>Your assignments</h1>
            <p>Problem batches your institution has assigned to you. Solve them in order or pick any one.</p>
          </div>
          <div className={styles.progressCard}>
            <div>
              <strong>{totals.problems}</strong>
              <span>Problems</span>
            </div>
            <div>
              <strong>{totals.solved}</strong>
              <span>Solved</span>
            </div>
            <div>
              <strong>{totals.progress}%</strong>
              <span>Progress</span>
            </div>
          </div>
        </section>

        <section className={styles.stageList}>
          {!loaded ? (
            <div className={styles.notFound}>
              <h1>Loading assignments…</h1>
            </div>
          ) : error ? (
            <div className={styles.notFound}>
              <h1>Could not load assignments</h1>
              <p>{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.notFound}>
              {institution ? <Layers3 /> : <Building2 />}
              <h1>No assignments yet</h1>
              <p>{institution ? `${institution.name} hasn't assigned any batches to you yet.` : 'Your account is not linked to an institution, so there are no assignments.'}</p>
            </div>
          ) : (
            items.map((batch, index) => {
              const done = batch.problems.filter((problem) => solved.includes(problem.slug)).length;
              return (
                <section key={`${batch.id}-${solved.length}`} className={styles.stage}>
                  <div className={styles.stageHeader}>
                    <div className={styles.stageNumber}>{String(index + 1).padStart(2, '0')}</div>
                    <div className={styles.stageInfo}>
                      <div className={styles.stageMeta}>
                        <span>{batch.focus || 'Batch'}</span>
                        <span>{`${done} of ${batch.total} solved`}</span>
                      </div>
                      <h2>{batch.name}</h2>
                      {batch.description && <p>{batch.description}</p>}
                    </div>
                  </div>
                  <div className={styles.problemArea}>
                    <ProblemList
                      key={`${batch.id}-${solved.join('-')}`}
                      problems={batch.problems.map(toPracticeProblem)}
                      context={{ source: 'assignments' }}
                      emptyTitle="No problems available"
                      emptyDescription="The problems in this batch are not available right now."
                    />
                  </div>
                </section>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
