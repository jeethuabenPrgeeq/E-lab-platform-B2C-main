import type { ReactNode } from 'react';
import { UploadScopeProvider } from '@/features/admin/practice-upload/scope';

export default function UploadContentLayout({ children }: { children: ReactNode }) {
  return <UploadScopeProvider scope="institute">{children}</UploadScopeProvider>;
}
