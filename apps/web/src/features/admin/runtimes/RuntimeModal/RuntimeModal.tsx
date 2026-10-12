'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { RUNTIME_CONFIG } from '../lib/config';
import { cx } from '../lib/shared';
import type { FieldDef, FieldValue, RuntimeKind, RuntimeRecord, RuntimeStore } from '../lib/types';
import styles from './RuntimeModal.module.css';

interface RuntimeModalProps {
  kind: RuntimeKind;
  initial: RuntimeRecord | null;
  store: RuntimeStore;
  onCancel: () => void;
  onSubmit: (values: Record<string, FieldValue>) => void;
}

type Draft = Record<string, string>;

function initialDraft(fields: FieldDef[], initial: RuntimeRecord | null, store: RuntimeStore, status: string): Draft {
  const draft: Draft = { status: initial ? initial.status : status };
  for (const field of fields) {
    if (initial) {
      draft[field.key] = String(initial[field.key] ?? '');
    } else if (field.kind === 'select') {
      draft[field.key] = field.options?.(store)[0]?.value ?? '';
    } else {
      draft[field.key] = '';
    }
  }
  return draft;
}

export function RuntimeModal({ kind, initial, store, onCancel, onSubmit }: RuntimeModalProps) {
  const config = RUNTIME_CONFIG[kind];
  const editableStatuses = kind === 'images' || (kind === 'versions' && initial?.isDefault) ? [] : config.statuses;
  const [draft, setDraft] = useState<Draft>(() => initialDraft(config.fields, initial, store, editableStatuses[0]?.value ?? 'ready'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstRef = useRef<HTMLInputElement & HTMLSelectElement>(null);

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

  const set = (key: string, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    for (const field of config.fields) {
      const value = (draft[field.key] ?? '').trim();
      if (field.required && !value) {
        next[field.key] = `${field.label} is required`;
        continue;
      }
      if (!value) continue;
      if (field.kind === 'number') {
        const number = Number(value);
        if (!Number.isFinite(number)) next[field.key] = 'Enter a number';
        else if (field.min !== undefined && number < field.min) next[field.key] = `Minimum is ${field.min}`;
        else if (field.max !== undefined && number > field.max) next[field.key] = `Maximum is ${field.max}`;
      }
      if (field.pattern && !field.pattern.regex.test(value)) next[field.key] = field.pattern.message;
    }

    const others = store[kind].filter((item) => item.id !== initial?.id);
    for (const keys of config.uniqueKeys) {
      if (keys.some((key) => next[key])) continue;
      const clash = others.some((item) => keys.every((key) => String(item[key]).toLowerCase() === (draft[key] ?? '').trim().toLowerCase()));
      if (clash) next[keys[keys.length - 1]] = config.uniqueMessage;
    }
    return next;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const values: Record<string, FieldValue> = {};
    for (const field of config.fields) {
      const value = (draft[field.key] ?? '').trim();
      values[field.key] = field.kind === 'number' ? Number(value) : value;
    }
    if (editableStatuses.length > 0) values.status = draft.status;
    onSubmit(values);
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="rt-modal-title">
        <div className={styles.modalHead}>
          <h2 id="rt-modal-title" className={styles.modalTitle}>
            {initial ? `Edit ${config.noun}` : `Add ${config.noun}`}
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} noValidate className={styles.form}>
          <div className={styles.grid}>
            {config.fields.map((field, index) => {
              const id = `rt-${field.key}`;
              const error = errors[field.key];
              const common = {
                id,
                ref: index === 0 ? firstRef : undefined,
                className: cx(styles.control, field.mono && styles.mono, error && styles.controlError),
                value: draft[field.key] ?? '',
                'aria-invalid': error ? true : undefined,
                'aria-describedby': error ? `${id}-error` : field.hint ? `${id}-hint` : undefined,
              };
              return (
                <div key={field.key} className={cx(styles.field, field.wide && styles.wide)}>
                  <label htmlFor={id} className={styles.label}>
                    {field.label}
                    {field.required && <span className={styles.required}> *</span>}
                  </label>
                  {field.kind === 'select' ? (
                    <select {...common} onChange={(event) => set(field.key, event.target.value)}>
                      {(field.options?.(store) ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...common}
                      type={field.kind === 'number' ? 'number' : 'text'}
                      inputMode={field.kind === 'number' ? 'decimal' : undefined}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      placeholder={field.placeholder}
                      onChange={(event) => set(field.key, event.target.value)}
                    />
                  )}
                  {error ? (
                    <p id={`${id}-error`} className={styles.errorText}>
                      {error}
                    </p>
                  ) : field.hint ? (
                    <p id={`${id}-hint`} className={styles.hint}>
                      {field.hint}
                    </p>
                  ) : null}
                </div>
              );
            })}

            {editableStatuses.length > 0 && (
              <fieldset className={cx(styles.fieldset, styles.wide)}>
                <legend className={styles.label}>Status</legend>
                <div className={styles.segmented} style={{ gridTemplateColumns: `repeat(${editableStatuses.length}, minmax(0, 1fr))` }}>
                  {editableStatuses.map((item) => (
                    <label key={item.value} className={cx(styles.segment, draft.status === item.value && styles.segmentActive)}>
                      <input
                        type="radio"
                        name="rt-status"
                        value={item.value}
                        checked={draft.status === item.value}
                        onChange={() => set('status', item.value)}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {kind === 'images' && !initial && <p className={cx(styles.hint, styles.wide)}>The image is pulled to the judge hosts after you add it.</p>}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              {initial ? 'Save changes' : `Add ${config.noun}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}