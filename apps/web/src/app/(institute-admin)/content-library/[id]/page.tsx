'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePermissions } from '@/features/admin/permissions/PermissionsProvider';
import { useProblem } from '@/features/admin/problems/lib/api';
import ProblemForm from '@/features/admin/problems/ProblemForm/ProblemForm';
import styles from '@/features/admin/problems/ProblemForm/ProblemForm.module.css';
import { IA_PROBLEMS, IA_ROUTE, IA_TECHNOLOGIES, type LibraryDetail } from '@/features/institute-admin/lib/api';

export default function Page() {
  const params = useParams<{ id: string }>();
  const { problem, loaded, loadError, update, transition } = useProblem(params.id, IA_PROBLEMS);
  const { has } = usePermissions();

  if (!loaded) return <div className={styles.page}>Loading…</div>;

  if (!problem) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          {loadError || 'Problem not found.'}{' '}
          <Link href={IA_ROUTE} className={styles.link}>
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  const detail = problem as LibraryDetail;
  return (
    <ProblemForm
      key={problem.id}
      problem={problem}
      onUpdate={update}
      onTransition={transition}
      basePath={IA_ROUTE}
      apiBase={IA_PROBLEMS}
      technologiesPath={IA_TECHNOLOGIES}
      readOnly={!detail.editable}
      guardConcurrency
      showTestLinks={has('inst.tests.manage')}
      testsPath="/test-case-preparation"
      backLabel="Back to library"
      editPermission="inst.content.create"
      transitionPermission="inst.content.view"
    />
  );
}
