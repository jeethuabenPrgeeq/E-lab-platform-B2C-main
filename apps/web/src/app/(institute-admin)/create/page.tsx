import ProblemForm from '@/features/admin/problems/ProblemForm/ProblemForm';
import { IA_PROBLEMS, IA_ROUTE, IA_TECHNOLOGIES } from '@/features/institute-admin/lib/api';

export default function Page() {
  return (
    <ProblemForm
      basePath={IA_ROUTE}
      apiBase={IA_PROBLEMS}
      technologiesPath={IA_TECHNOLOGIES}
      showTestLinks={false}
      backLabel="Back to library"
      editPermission="inst.content.create"
    />
  );
}
