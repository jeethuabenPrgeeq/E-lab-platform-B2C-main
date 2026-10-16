'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { INSTITUTION_PERMISSION_ITEMS } from '../../access/lib/shared';
import type { InstitutionPermissionKey } from '../../access/lib/types';
import styles from '../../access/ui/modal.module.css';
import { EMAIL_PATTERN, cx } from '../../users/lib/shared';
import { CODE_PATTERN, INSTITUTION_TYPES } from '../lib/shared';
import type { CreateInstitutionInput, InstitutionType } from '../lib/types';

interface CreateInstitutionModalProps {
  busy: boolean;
  serverError: string;
  onCancel: () => void;
  onSubmit: (input: CreateInstitutionInput) => void;
}

type Errors = Partial<Record<'name' | 'code' | 'contactEmail', string>>;

const DEFAULT_PERMISSIONS: InstitutionPermissionKey[] = ['inst.content.view', 'inst.content.create'];

export function CreateInstitutionModal({ busy, serverError, onCancel, onSubmit }: CreateInstitutionModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<InstitutionType>('university');
  const [contactEmail, setContactEmail] = useState('');
  const [permissions, setPermissions] = useState<InstitutionPermissionKey[]>(DEFAULT_PERMISSIONS);
  const [errors, setErrors] = useState<Errors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggle = (key: InstitutionPermissionKey) =>
    setPermissions((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    const cleanEmail = contactEmail.trim().toLowerCase();
    if (name.trim().length < 2) next.name = 'Enter the institution’s name';
    if (!CODE_PATTERN.test(code.trim())) next.code = 'Use 2–20 letters, numbers or dashes';
    if (cleanEmail && !EMAIL_PATTERN.test(cleanEmail)) next.contactEmail = 'Enter a valid email address';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({ name: name.trim(), code: code.trim().toUpperCase(), type, contactEmail: cleanEmail || undefined, permissions });
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="create-institution-title">
        <div className={styles.modalHead}>
          <h2 id="create-institution-title" className={styles.modalTitle}>
            Register institution
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.grid}>
            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="inst-name" className={styles.label}>
                Institution name<span className={styles.required}> *</span>
              </label>
              <input
                id="inst-name"
                ref={nameRef}
                className={cx(styles.control, errors.name && styles.controlError)}
                value={name}
                placeholder="e.g. Christ University"
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((current) => ({ ...current, name: undefined }));
                }}
                aria-invalid={errors.name ? true : undefined}
              />
              {errors.name && <p className={styles.errorText}>{errors.name}</p>}
            </div>

            <div className={styles.field}>
              <label htmlFor="inst-code" className={styles.label}>
                Code<span className={styles.required}> *</span>
              </label>
              <input
                id="inst-code"
                className={cx(styles.control, styles.mono, errors.code && styles.controlError)}
                value={code}
                placeholder="CHRIST-BLR"
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase());
                  setErrors((current) => ({ ...current, code: undefined }));
                }}
                aria-invalid={errors.code ? true : undefined}
              />
              {errors.code ? <p className={styles.errorText}>{errors.code}</p> : <p className={styles.hint}>Unique short code. It cannot be reused.</p>}
            </div>

            <div className={styles.field}>
              <label htmlFor="inst-type" className={styles.label}>
                Type
              </label>
              <select id="inst-type" className={styles.control} value={type} onChange={(event) => setType(event.target.value as InstitutionType)}>
                {INSTITUTION_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="inst-email" className={styles.label}>
                Contact email
              </label>
              <input
                id="inst-email"
                type="email"
                className={cx(styles.control, errors.contactEmail && styles.controlError)}
                value={contactEmail}
                placeholder="it-admin@institution.edu"
                onChange={(event) => {
                  setContactEmail(event.target.value);
                  setErrors((current) => ({ ...current, contactEmail: undefined }));
                }}
                aria-invalid={errors.contactEmail ? true : undefined}
              />
              {errors.contactEmail && <p className={styles.errorText}>{errors.contactEmail}</p>}
            </div>

            <fieldset className={cx(styles.fieldset, styles.wide)}>
              <legend className={styles.label}>What its Institute Admins can do</legend>
              {INSTITUTION_PERMISSION_ITEMS.map((item) => (
                <label key={item.key} className={styles.confirmRow}>
                  <input type="checkbox" checked={permissions.includes(item.key)} onChange={() => toggle(item.key)} />
                  <span>
                    <strong>{item.label}</strong>
                    <span className={styles.muted}>{` — ${item.description}`}</span>
                  </span>
                </label>
              ))}
              <p className={styles.hint}>You can change these later from the institution’s page.</p>
            </fieldset>
          </div>

          {serverError && (
            <p className={styles.errorText} role="alert">
              {serverError}
            </p>
          )}

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton} disabled={busy}>
              {busy ? 'Registering…' : 'Register institution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
