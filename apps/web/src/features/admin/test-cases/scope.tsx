'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type TestCaseScopeKey = 'platform' | 'institute';

export interface TestCaseScope {
  basePath: string;
  apiPrefix: string;
  title: string;
  empty: string;
  simulatedRuns: boolean;
}

const SCOPES: Record<TestCaseScopeKey, TestCaseScope> = {
  platform: {
    basePath: '/test-cases',
    apiPrefix: '/admin',
    title: 'Test Case Management',
    empty: 'No problems yet. Create one in Problem Management.',
    simulatedRuns: true,
  },
  institute: {
    basePath: '/test-case-preparation',
    apiPrefix: '/institute',
    title: 'Test Case Preparation',
    empty: 'No problems yet. Create or upload one from the Content Library.',
    simulatedRuns: false,
  },
};

const TestCaseScopeContext = createContext<TestCaseScope>(SCOPES.platform);

export function TestCaseScopeProvider({ scope, children }: { scope: TestCaseScopeKey; children: ReactNode }) {
  return <TestCaseScopeContext.Provider value={SCOPES[scope]}>{children}</TestCaseScopeContext.Provider>;
}

export function useTestCaseScope() {
  return useContext(TestCaseScopeContext);
}
