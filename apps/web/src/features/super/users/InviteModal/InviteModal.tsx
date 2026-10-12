'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { EMAIL_PATTERN, INSTITUTIONS, PLAN_META, ROLE_META, cx } from '../lib/shared';
import type { InviteInput, UserPlan, UserRole } from '../lib/types';
import styles from './InviteModal.module.css';

interface InviteModalProps {
  existingEmails: Set<string>;
  onCancel: () => void;
  onSubmit: (input: InviteInput) => void;
}

const MAX = 200;

export function InviteModal({ existingEmails, onCancel, onSubmit }: InviteModalProps) {
  const [text, setText] = useState('');
  const [role, setRole] = useState<UserRole>('learner');
  const [institution, setInstitution] = useState(INSTITUTIONS[0]);
  const [plan, setPlan] = useState<UserPlan>('free');
  const [error, setError] = useState('');
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    areaRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const parsed = useMemo(() => {
    const tokens = text.split(/[\s,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
    const seen = new Set<string>();
    const valid: string[] = [];
    const invalid: string[] = [];
    const existing: string[] = [];
    let duplicates = 0;
    for (const token of tokens) {
      if (seen.has(token)) {
        duplicates += 1;
        continue;
      }
      seen.add(token);
      if (!EMAIL_PATTERN.test(token)) invalid.push(token);
      else if (existingEmails.has(token)) existing.push(token);
      else valid.push(token);
    }
    return { valid, invalid, existing, duplicates };
  }, [text, existingEmails]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (parsed.valid.length === 0) {
      setError(parsed.invalid.length || parsed.existing.length ? 'None of these emails can be invited — fix the ones listed below' : 'Enter at least one email address');
      return;
    }
    if (parsed.valid.length > MAX) {
      setError(`Invite at most ${MAX} people at a time`);
      return;
    }
    onSubmit({ emails: parsed.valid, role, institution: plan === 'enterprise' && institution === 'Independent' ? INSTITUTIONS[0] : institution, plan });
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="invite-title">
        <div className={styles.modalHead}>
          <h2 id="invite-title" className={styles.modalTitle}>
            Invite users
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.grid}>
            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="invite-emails" className={styles.label}>
                Email addresses<span className={styles.required}> *</span>
              </label>
              <textarea
                id="invite-emails"
                ref={areaRef}
                className={cx(styles.control, error && styles.controlError)}
                rows={5}
                placeholder={'priya.nair@christ.edu\nrahul.menon@nitc.edu, sneha@gmail.com'}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby="invite-msg"
              />
              <p id="invite-msg" className={error ? styles.errorText : styles.hint}>
                {error || 'Paste emails separated by commas, spaces or new lines'}
              </p>
              {text.trim() && (
                <div className={styles.summary}>
                  <span className={styles.ok}>{`${parsed.valid.length} will be invited`}</span>
                  {parsed.existing.length > 0 && <span className={styles.warn}>{`${parsed.existing.length} already have an account`}</span>}
                  {parsed.invalid.length > 0 && <span className={styles.bad}>{`${parsed.invalid.length} not valid: ${parsed.invalid.slice(0, 3).join(', ')}${parsed.invalid.length > 3 ? '…' : ''}`}</span>}
                  {parsed.duplicates > 0 && <span className={styles.muted}>{`${parsed.duplicates} duplicate${parsed.duplicates === 1 ? '' : 's'} skipped`}</span>}
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="invite-role" className={styles.label}>
                Role
              </label>
              <select id="invite-role" className={styles.control} value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                {Object.entries(ROLE_META).map(([value, meta]) => (
                  <option key={value} value={value} disabled={value !== 'learner'}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="invite-plan" className={styles.label}>
                Plan
              </label>
              <select
                id="invite-plan"
                className={styles.control}
                value={plan}
                disabled
                onChange={(event) => {
                  const next = event.target.value as UserPlan;
                  setPlan(next);
                  if (next !== 'enterprise') setInstitution('Independent');
                  else if (institution === 'Independent') setInstitution(INSTITUTIONS[0]);
                }}
              >
                {Object.entries(PLAN_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="invite-inst" className={styles.label}>
                Institution
              </label>
              <select id="invite-inst" className={styles.control} value={institution} disabled={plan !== 'enterprise'} onChange={(event) => setInstitution(event.target.value)}>
                {INSTITUTIONS.filter((name) => (plan === 'enterprise' ? name !== 'Independent' : name === 'Independent')).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <p className={styles.hint}>New learners start on the Free plan. Paid plans begin when they subscribe. Each invite creates a temporary password for you to share.</p>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              {parsed.valid.length > 1 ? `Send ${parsed.valid.length} invitations` : 'Send invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
