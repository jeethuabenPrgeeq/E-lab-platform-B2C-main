'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { COMPONENTS, ME, SEVERITY_META, cx } from '../lib/shared';
import type { ComponentId, DeclareInput, Severity } from '../lib/types';
import styles from './DeclareModal.module.css';

interface DeclareModalProps {
  responders: string[];
  onCancel: () => void;
  onSubmit: (input: DeclareInput) => void;
}

type Errors = Partial<Record<'title' | 'components' | 'message', string>>;

export function DeclareModal({ responders, onCancel, onSubmit }: DeclareModalProps) {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<Severity>('sev2');
  const [components, setComponents] = useState<ComponentId[]>([]);
  const [commander, setCommander] = useState(ME);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clear = (key: keyof Errors) => {
    if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    const cleanTitle = title.trim();
    if (cleanTitle.length < 8) next.title = 'Describe the impact in at least 8 characters';
    else if (cleanTitle.length > 120) next.title = 'Keep the title under 120 characters';
    if (components.length === 0) next.components = 'Pick at least one affected component';
    if (message.trim().length < 10) next.message = 'Write a first update of at least 10 characters';
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    onSubmit({ title: cleanTitle, severity, components, commander, message: message.trim() });
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="declare-title">
        <div className={styles.modalHead}>
          <h2 id="declare-title" className={styles.modalTitle}>
            Declare incident
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.grid}>
            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="inc-title" className={styles.label}>
                What is happening?<span className={styles.required}> *</span>
              </label>
              <input
                id="inc-title"
                ref={titleRef}
                className={cx(styles.control, errors.title && styles.controlError)}
                placeholder="e.g. Submissions failing with sandbox errors"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clear('title');
                }}
                aria-invalid={errors.title ? true : undefined}
                aria-describedby="inc-title-msg"
              />
              <p id="inc-title-msg" className={errors.title ? styles.errorText : styles.hint}>
                {errors.title || 'Describe the impact, not the cause'}
              </p>
            </div>

            <fieldset className={cx(styles.fieldset, styles.wide)}>
              <legend className={styles.label}>Severity</legend>
              <div className={styles.severityGrid}>
                {(Object.keys(SEVERITY_META) as Severity[]).map((value) => {
                  const meta = SEVERITY_META[value];
                  return (
                    <label key={value} className={cx(styles.severityCard, severity === value && styles.severityActive, styles[`sev_${meta.tone}`])}>
                      <input type="radio" name="inc-severity" value={value} checked={severity === value} onChange={() => setSeverity(value)} />
                      <strong>{meta.label}</strong>
                      <span>{meta.description}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className={cx(styles.fieldset, styles.wide)} aria-describedby="inc-comp-msg">
              <legend className={styles.label}>
                Affected components<span className={styles.required}> *</span>
              </legend>
              <div className={styles.chips}>
                {COMPONENTS.map((item) => {
                  const on = components.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cx(styles.chip, on && styles.chipOn)}
                      aria-pressed={on}
                      onClick={() => {
                        setComponents((current) => (on ? current.filter((id) => id !== item.id) : [...current, item.id]));
                        clear('components');
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {errors.components && (
                <p id="inc-comp-msg" className={styles.errorText}>
                  {errors.components}
                </p>
              )}
            </fieldset>

            <div className={styles.field}>
              <label htmlFor="inc-commander" className={styles.label}>
                Incident commander
              </label>
              <select id="inc-commander" className={styles.control} value={commander} onChange={(event) => setCommander(event.target.value)}>
                {responders.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </div>

            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="inc-message" className={styles.label}>
                First update<span className={styles.required}> *</span>
              </label>
              <textarea
                id="inc-message"
                className={cx(styles.control, errors.message && styles.controlError)}
                rows={4}
                placeholder="What do we know so far, and who is affected?"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  clear('message');
                }}
                aria-invalid={errors.message ? true : undefined}
                aria-describedby="inc-message-msg"
              />
              <p id="inc-message-msg" className={errors.message ? styles.errorText : styles.hint}>
                {errors.message || 'Published on the status page as “Investigating”'}
              </p>
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={cx(styles.primaryButton, styles.dangerButton)}>
              Declare incident
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}