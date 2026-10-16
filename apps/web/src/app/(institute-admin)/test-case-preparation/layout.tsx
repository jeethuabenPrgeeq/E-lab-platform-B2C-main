import type { ReactNode } from 'react';
import { TestCaseScopeProvider } from '@/features/admin/test-cases/scope';

export default function TestCasePreparationLayout({ children }: { children: ReactNode }) {
  return <TestCaseScopeProvider scope="institute">{children}</TestCaseScopeProvider>;
}
