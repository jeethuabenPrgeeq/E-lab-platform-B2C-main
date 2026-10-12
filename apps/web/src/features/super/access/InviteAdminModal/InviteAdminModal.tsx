'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { ALL_SCOPE, EMAIL_PATTERN, PERMISSION_LABEL, SCOPES, SUPER_ROLE, cx } from '../lib/shared';
import type { AdminRole, InviteAdminInput } from '../lib/types';
import styles from '../ui/modal.module.css';

interface InviteAdminModalProps {
  roles: AdminRole[];
  existingEmails: Set<string>;
  onCancel: () => void;
  onSubmit: (input: InviteAdminInput) => void;
}

type Errors = Partial<Record<'name' | 'email' | 'confirm', string>>;

export function InviteAdminModal({ roles, existingEmails, onCancel, onSubmit }: InviteAdminModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(roles.find((role) => role.id === 'support_agent')?.id ?? roles[0]?.id ?? '');
  const [scope, setScope] = useState(ALL_SCOPE);
  const [confirmSuper, setConfirmSuper] = useState(false);
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

  const role = roles.find((item) => item.id === roleId);
  const isSuper = roleId === SUPER_ROLE;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    const cleanEmail = email.trim().toLowerCase();
    if (name.trim().length < 2) next.name = 'Enter their full name';
    if (!EMAIL_PATTERN.test(cleanEmail)) next.email = 'Enter a valid email address';
    else if (existingEmails.has(cleanEmail)) next.email = 'This person is already an admin';
    if (isSuper && !confirmSuper) next.confirm = 'Confirm that this person should have full access';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({ name: name.trim(), email: cleanEmail, roleId, scope: isSuper ? ALL_SCOPE : scope });
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="invite-admin-title">
        <div className={styles.modalHead}>
          <h2 id="invite-admin-title" className={styles.modalTitle}>
            Invite admin
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="admin-name" className={styles.label}>
                Full name<span className={styles.required}> *</span>
              </label>
              <input
                id="admin-name"
                ref={nameRef}
                className={cx(styles.control, errors.name && styles.controlError)}
                value={name}
                placeholder="e.g. Priya Nair"
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((current) => ({ ...current, name: undefined }));
                }}
                aria-invalid={errors.name ? true : undefined}
              />
              {errors.name && <p className={styles.errorText}>{errors.name}</p>}
            </div>

            <div className={styles.field}>
              <label htmlFor="admin-email" className={styles.label}>
                Work email<span className={styles.required}> *</span>
              </label>
              <input
                id="admin-email"
                type="email"
                className={cx(styles.control, errors.email && styles.controlError)}
                value={email}
                placeholder="priya.nair@elab.com"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrors((current) => ({ ...current, email: undefined }));
                }}
                aria-invalid={errors.email ? true : undefined}
              />
              {errors.email && <p className={styles.errorText}>{errors.email}</p>}
            </div>

            <div className={styles.field}>
              <label htmlFor="admin-role" className={styles.label}>
                Role
              </label>
              <select
                id="admin-role"
                className={styles.control}
                value={roleId}
                onChange={(event) => {
                  setRoleId(event.target.value);
                  setConfirmSuper(false);
                  setErrors((current) => ({ ...current, confirm: undefined }));
                }}
              >
                {roles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="admin-scope" className={styles.label}>
                Scope
              </label>
              <select id="admin-scope" className={styles.control} value={isSuper ? ALL_SCOPE : scope} disabled={isSuper} onChange={(event) => setScope(event.target.value)}>
                {SCOPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            {role && (
              <div className={cx(styles.field, styles.wide)}>
                <p className={styles.hint}>
                  {role.locked
                    ? 'Super admins can do everything, including inviting and removing other admins.'
                    : role.permissions.length
                      ? `${role.name}: ${role.permissions.map((key) => PERMISSION_LABEL[key].toLowerCase()).join(', ')}.`
                      : `${role.name} has no permissions yet.`}
                </p>
              </div>
            )}

            {isSuper && (
              <div className={cx(styles.field, styles.wide)}>
                <label className={styles.confirmRow}>
                  <input
                    type="checkbox"
                    checked={confirmSuper}
                    onChange={(event) => {
                      setConfirmSuper(event.target.checked);
                      setErrors((current) => ({ ...current, confirm: undefined }));
                    }}
                  />
                  I understand this person will have full, unrestricted access to eLab
                </label>
                {errors.confirm && <p className={styles.errorText}>{errors.confirm}</p>}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              Send invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}