import ProblemForm from '@/features/content-manager/create/ProblemForm';
import { CM_PROBLEMS, CM_ROUTE, CM_TECHNOLOGIES } from '@/features/content-manager/lib/api';

export default function Page() {
  return (
    <ProblemForm
      basePath={CM_ROUTE}
      apiBase={CM_PROBLEMS}
      technologiesPath={CM_TECHNOLOGIES}
      showTestLinks={false}
      backLabel="Back to library"
    />
  );
}
