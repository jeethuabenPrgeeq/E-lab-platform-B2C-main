'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { cx } from '../lib/shared';
import type { AdminRole, NewRoleInput } from '../lib/types';
import styles from '../ui/modal.module.css';

interface RoleModalProps {
  roles: AdminRole[];
  onCancel: () => void;
  onSubmit: (input: NewRoleInput) => void;
}

export function RoleModal({ roles, onCancel, onSubmit }: RoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copyFrom, setCopyFrom] = useState('');
  const [error, setError] = useState('');
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = name.trim();
    if (clean.length < 3) {
      setError('Give the role a name of at least 3 characters');
      return;
    }
    if (roles.some((role) => role.name.toLowerCase() === clean.toLowerCase())) {
      setError('A role with this name already exists');
      return;
    }
    onSubmit({ name: clean, description, copyFrom: copyFrom || null });
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="role-title">
        <div className={styles.modalHead}>
          <h2 id="role-title" className={styles.modalTitle}>
            New role
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.grid}>
            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="role-name" className={styles.label}>
                Role name<span className={styles.required}> *</span>
              </label>
              <input
                id="role-name"
                ref={nameRef}
                className={cx(styles.control, error && styles.controlError)}
                value={name}
                placeholder="e.g. Institution success"
                maxLength={40}
                onChange={(event) => {
                  setName(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              {error && <p className={styles.errorText}>{error}</p>}
            </div>

            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="role-desc" className={styles.label}>
                Description
              </label>
              <input id="role-desc" className={styles.control} value={description} placeholder="What people in this role are responsible for" maxLength={90} onChange={(event) => setDescription(event.target.value)} />
            </div>

            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="role-copy" className={styles.label}>
                Start from
              </label>
              <select id="role-copy" className={styles.control} value={copyFrom} onChange={(event) => setCopyFrom(event.target.value)}>
                <option value="">No permissions</option>
                {roles
                  .filter((role) => !role.locked)
                  .map((role) => (
                    <option key={role.id} value={role.id}>
                      {`Copy of ${role.name}`}
                    </option>
                  ))}
              </select>
              <p className={styles.hint}>You can fine-tune the permissions in the table after creating it</p>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              Create role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}