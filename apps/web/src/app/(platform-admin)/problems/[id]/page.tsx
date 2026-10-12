'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useProblem } from '@/features/admin/problems/lib/api';
import ProblemForm from '@/features/admin/problems/ProblemForm/ProblemForm';
import styles from '@/features/admin/problems/ProblemForm/ProblemForm.module.css';

export default function Page() {
  const params = useParams<{ id: string }>();
  const { problem, loaded, loadError, update, transition } = useProblem(params.id);

  if (!loaded) return <div className={styles.page}>Loading…</div>;

  if (!problem) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          {loadError || 'Problem not found.'} <Link href="/problems" className={styles.link}>Back to all problems</Link>
        </div>
      </div>
    );
  }

  return <ProblemForm key={problem.id} problem={problem} onUpdate={update} onTransition={transition} />;
}
