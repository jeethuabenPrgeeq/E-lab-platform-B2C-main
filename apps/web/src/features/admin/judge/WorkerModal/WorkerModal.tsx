'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { cx } from '../lib/shared';
import type { JudgeWorker, WorkerInput } from '../lib/types';
import styles from './WorkerModal.module.css';

interface WorkerModalProps {
  initial: JudgeWorker | null;
  workers: JudgeWorker[];
  onCancel: () => void;
  onSubmit: (input: WorkerInput) => void;
}

type Draft = Record<keyof WorkerInput, string>;
type Errors = Partial<Record<keyof WorkerInput, string>>;

const HOST = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?::\d{2,5})?$|^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(?::\d{2,5})?$/i;
const NAME = /^[a-z0-9][a-z0-9-]{1,39}$/;
const VERSION = /^\d+\.\d+\.\d+$/;

export function WorkerModal({ initial, workers, onCancel, onSubmit }: WorkerModalProps) {
  const [draft, setDraft] = useState<Draft>({
    name: initial?.name ?? '',
    host: initial?.host ?? '',
    capacity: String(initial?.capacity ?? 8),
    version: initial?.version ?? workers[0]?.version ?? '1.4.2',
  });
  const [errors, setErrors] = useState<Errors>({});
  const firstRef = useRef<HTMLInputElement>(null);

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

  const set = (key: keyof WorkerInput, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }));
  };

  const validate = (): Errors => {
    const next: Errors = {};
    const others = workers.filter((worker) => worker.id !== initial?.id);
    const name = draft.name.trim().toLowerCase();
    const host = draft.host.trim().toLowerCase();
    const capacity = Number(draft.capacity);

    if (!name) next.name = 'Name is required';
    else if (!NAME.test(name)) next.name = 'Lowercase letters, numbers and dashes (2–40)';
    else if (others.some((worker) => worker.name.toLowerCase() === name)) next.name = 'A worker with this name already exists';

    if (!host) next.host = 'Host is required';
    else if (!HOST.test(host)) next.host = 'Enter an IP or hostname, optionally with :port';
    else if (others.some((worker) => worker.host.toLowerCase() === host)) next.host = 'Another worker already uses this host';

    if (!draft.capacity.trim()) next.capacity = 'Capacity is required';
    else if (!Number.isInteger(capacity)) next.capacity = 'Enter a whole number';
    else if (capacity < 1 || capacity > 64) next.capacity = 'Between 1 and 64';
    else if (initial && capacity < initial.running) next.capacity = `${initial.running} jobs are running — drain first`;

    if (!draft.version.trim()) next.version = 'Version is required';
    else if (!VERSION.test(draft.version.trim())) next.version = 'Use semantic versioning, e.g. 1.4.2';

    return next;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    onSubmit({
      name: draft.name.trim().toLowerCase(),
      host: draft.host.trim().toLowerCase(),
      capacity: Number(draft.capacity),
      version: draft.version.trim(),
    });
  };

  const field = (key: keyof WorkerInput, label: string, props: { placeholder?: string; mono?: boolean; hint?: string; number?: boolean }) => {
    const id = `wk-${key}`;
    const error = errors[key];
    return (
      <div className={styles.field}>
        <label htmlFor={id} className={styles.label}>
          {label}
          <span className={styles.required}> *</span>
        </label>
        <input
          id={id}
          ref={key === 'name' ? firstRef : undefined}
          className={cx(styles.control, props.mono && styles.mono, error && styles.controlError)}
          type={props.number ? 'number' : 'text'}
          inputMode={props.number ? 'numeric' : undefined}
          min={props.number ? 1 : undefined}
          max={props.number ? 64 : undefined}
          placeholder={props.placeholder}
          value={draft[key]}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : props.hint ? `${id}-hint` : undefined}
          onChange={(event) => set(key, event.target.value)}
        />
        {error ? (
          <p id={`${id}-error`} className={styles.errorText}>
            {error}
          </p>
        ) : props.hint ? (
          <p id={`${id}-hint`} className={styles.hint}>
            {props.hint}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="wk-modal-title">
        <div className={styles.modalHead}>
          <h2 id="wk-modal-title" className={styles.modalTitle}>
            {initial ? `Edit ${initial.name}` : 'Add worker'}
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} noValidate className={styles.form}>
          <div className={styles.grid}>
            {field('name', 'Name', { placeholder: 'judge-05', mono: true })}
            {field('host', 'Host', { placeholder: '10.0.1.15', mono: true })}
            {field('capacity', 'Capacity (parallel jobs)', { number: true, hint: 'How many submissions this worker runs at once' })}
            {field('version', 'Judge version', { placeholder: '1.4.2', mono: true })}
            {!initial && <p className={cx(styles.hint, styles.wide)}>The worker joins as online and starts taking jobs on the next poll.</p>}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              {initial ? 'Save changes' : 'Add worker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}