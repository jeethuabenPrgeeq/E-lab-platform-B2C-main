export type ContentArea = 'practice' | 'stack' | 'realtime_challenge';

export type UploadMethod = 'manual' | 'csv' | 'ai';

export type ContentStatus =
  | 'draft'
  | 'validation_pending'
  | 'validation_failed'
  | 'validated'
  | 'ready_to_publish'
  | 'published'
  | 'unpublished'
  | 'archived';

export type ValidationSeverity = 'error' | 'warning';

export type ValidationType =
  | 'REQUIRED_FIELD'
  | 'SCHEMA'
  | 'FORMAT'
  | 'RELATIONSHIP'
  | 'DUPLICATE'
  | 'BUSINESS_RULE'
  | 'TEST_CASE'
  | 'RUNTIME';

export type FrameworkOrDomainRef =
  | { kind: 'framework'; slug: string }
  | { kind: 'domain'; slug: string };
