'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { AccessTier } from '../../content/lib/types';
import { LEVEL_META, TIERS, TIER_META, cx } from '../lib/shared';
import type { NewPathInput, PathLevel } from '../lib/types';
import styles from '../ui/modal.module.css';

interface NewPathModalProps {
  existingTitles: Set<string>;
  onCancel: () => void;
  onSubmit: (input: NewPathInput) => void;
}

export function NewPathModal({ existingTitles, onCancel, onSubmit }: NewPathModalProps) {
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<PathLevel>('beginner');
  const [tier, setTier] = useState<AccessTier>('starter');
  const [error, setError] = useState('');
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (clean.length < 3) {
      setError('Give the path a title of at least 3 characters');
      return;
    }
    if (existingTitles.has(clean.toLowerCase())) {
      setError('A path with this title already exists');
      return;
    }
    onSubmit({ title: clean, level, tier });
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="new-path-title">
        <div className={styles.modalHead}>
          <h2 id="new-path-title" className={styles.modalTitle}>
            New learning path
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.grid}>
            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="path-name" className={styles.label}>
                Title<span className={styles.required}> *</span>
              </label>
              <input
                id="path-name"
                ref={titleRef}
                className={cx(styles.control, error && styles.controlError)}
                value={title}
                maxLength={60}
                placeholder="e.g. Python for Data Analysis"
                onChange={(event) => {
                  setTitle(event.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
              />
              {error && <p className={styles.errorText}>{error}</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor="path-level" className={styles.label}>
                Level
              </label>
              <select id="path-level" className={styles.control} value={level} onChange={(event) => setLevel(event.target.value as PathLevel)}>
                {Object.entries(LEVEL_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="path-tier" className={styles.label}>
                Access
              </label>
              <select id="path-tier" className={styles.control} value={tier} onChange={(event) => setTier(event.target.value as AccessTier)}>
                {TIERS.map((value) => (
                  <option key={value} value={value}>
                    {TIER_META[value].label}
                  </option>
                ))}
              </select>
            </div>
            <p className={cx(styles.hint, styles.wide)}>It starts as a draft. You add the summary and steps next, then publish when it is ready.</p>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              Create and add steps
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
