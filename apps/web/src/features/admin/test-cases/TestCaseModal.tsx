'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { cx } from './shared';
import type { TestCaseItem, Visibility } from './types';
import styles from './test-cases.module.css';

const MAX_LENGTH = 20000;

export interface TestCaseDraft {
  input: string;
  expectedOutput: string;
}

interface TestCaseModalProps {
  visibility: Visibility;
  initial: TestCaseItem | null;
  needsReason?: boolean;
  onCancel: () => void;
  onSubmit: (draft: TestCaseDraft, reason?: string) => Promise<string | null>;
}

export function TestCaseModal({ visibility, initial, needsReason = false, onCancel, onSubmit }: TestCaseModalProps) {
  const isHidden = visibility === 'hidden';
  const noun = isHidden ? 'hidden test' : 'sample test';
  const [input, setInput] = useState(initial?.input ?? '');
  const [expected, setExpected] = useState(initial?.expectedOutput ?? '');
  const [errors, setErrors] = useState<{ input?: string; expected?: string; reason?: string }>({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const firstRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: { input?: string; expected?: string; reason?: string } = {};

    if (isHidden && !input.trim()) next.input = 'Input is required for a hidden test';
    if (input.length > MAX_LENGTH) next.input = `Keep the input under ${MAX_LENGTH} characters`;
    if (!expected.trim()) next.expected = 'Expected output is required';
    if (expected.length > MAX_LENGTH) next.expected = `Keep the expected output under ${MAX_LENGTH} characters`;

    if (needsReason && reason.trim().length < 5) next.reason = 'This problem is live. Give a reason of at least 5 characters';

    setErrors(next);
    if (next.input || next.expected || next.reason) return;

    setSaving(true);
    setServerError('');
    const failure = await onSubmit({ input: input.replace(/\s+$/, ''), expectedOutput: expected.replace(/\s+$/, '') }, needsReason ? reason.trim() : undefined);
    setSaving(false);
    if (failure) setServerError(failure);
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="tc-modal-title">
        <div className={styles.modalHead}>
          <h2 id="tc-modal-title" className={styles.modalTitle}>
            {initial ? `Edit ${noun}` : `Add ${noun}`}
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={20} height={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} noValidate className={styles.modalBody}>
          <div className={styles.field}>
            <label htmlFor="tc-input" className={styles.label}>
              Input{isHidden && <span className={styles.requiredMark}> *</span>}
            </label>
            <textarea
              id="tc-input"
              ref={firstRef}
              rows={4}
              value={input}
              aria-invalid={errors.input ? true : undefined}
              aria-describedby={errors.input ? 'tc-input-error' : 'tc-input-hint'}
              className={cx(styles.control, errors.input && styles.controlError)}
              onChange={(event) => {
                setInput(event.target.value);
                if (errors.input) setErrors((prev) => ({ ...prev, input: undefined }));
              }}
            />
            {errors.input ? (
              <p id="tc-input-error" className={styles.errorText}>
                {errors.input}
              </p>
            ) : (
              <p id="tc-input-hint" className={styles.hint}>
                {isHidden ? 'Exactly what the program reads from standard input' : 'Leave empty if the program takes no input'}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="tc-expected" className={styles.label}>
              Expected output<span className={styles.requiredMark}> *</span>
            </label>
            <textarea
              id="tc-expected"
              rows={4}
              value={expected}
              aria-invalid={errors.expected ? true : undefined}
              aria-describedby={errors.expected ? 'tc-expected-error' : undefined}
              className={cx(styles.control, errors.expected && styles.controlError)}
              onChange={(event) => {
                setExpected(event.target.value);
                if (errors.expected) setErrors((prev) => ({ ...prev, expected: undefined }));
              }}
            />
            {errors.expected && (
              <p id="tc-expected-error" className={styles.errorText}>
                {errors.expected}
              </p>
            )}
          </div>

          {needsReason && (
            <div className={styles.field}>
              <label htmlFor="tc-reason" className={styles.label}>
                Reason for the change<span className={styles.requiredMark}> *</span>
              </label>
              <input
                id="tc-reason"
                value={reason}
                className={cx(styles.control, errors.reason && styles.controlError)}
                placeholder="e.g. Cover negative numbers"
                onChange={(event) => {
                  setReason(event.target.value);
                  if (errors.reason) setErrors((prev) => ({ ...prev, reason: undefined }));
                }}
              />
              {errors.reason ? (
                <p className={styles.errorText}>{errors.reason}</p>
              ) : (
                <p className={styles.hint}>The problem is published, so this change creates a new version</p>
              )}
            </div>
          )}

          {serverError && (
            <p className={styles.errorText} role="alert">
              {serverError}
            </p>
          )}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.secondaryButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? 'Saving…' : initial ? 'Save changes' : `Add ${noun}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}