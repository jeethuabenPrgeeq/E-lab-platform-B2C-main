'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { saveInstitutionUpload, savePracticeDrafts, type SaveDraftsInput, type SaveDraftsResult } from './api';

export type UploadScopeKey = 'platform' | 'institute';

export interface UploadScope {
  basePath: string;
  title: string;
  technologiesPath?: string;
  canCreateTechnology: boolean;
  save: (input: SaveDraftsInput) => Promise<SaveDraftsResult>;
  savedOne: (title: string, technology: string) => string;
  savedMany: (technology: string) => string;
  uploaded: (problems: string) => string;
  saveHint: string;
}

const SCOPES: Record<UploadScopeKey, UploadScope> = {
  platform: {
    basePath: '/content-import',
    title: 'Upload to Practice',
    canCreateTechnology: true,
    save: savePracticeDrafts,
    savedOne: (title, technology) => `“${title}” was added to ${technology} practice and is waiting for technical review.`,
    savedMany: (technology) => `They were added to ${technology} practice and are waiting for technical review.`,
    uploaded: (problems) => `Uploaded ${problems} as draft for technical review.`,
    saveHint: 'Saved problems go to Draft for technical review',
  },
  institute: {
    basePath: '/upload-content',
    title: 'Upload Content',
    technologiesPath: '/institute/technologies',
    canCreateTechnology: false,
    save: saveInstitutionUpload,
    savedOne: (title) => `“${title}” is now a draft in your Content Library, with its test cases.`,
    savedMany: () => 'They are now drafts in your Content Library, with their test cases.',
    uploaded: (problems) => `Uploaded ${problems} as drafts to your Content Library.`,
    saveHint: 'Saved problems become drafts in your Content Library',
  },
};

const UploadScopeContext = createContext<UploadScope>(SCOPES.platform);

export function UploadScopeProvider({ scope, children }: { scope: UploadScopeKey; children: ReactNode }) {
  return <UploadScopeContext.Provider value={SCOPES[scope]}>{children}</UploadScopeContext.Provider>;
}

export function useUploadScope() {
  return useContext(UploadScopeContext);
}
