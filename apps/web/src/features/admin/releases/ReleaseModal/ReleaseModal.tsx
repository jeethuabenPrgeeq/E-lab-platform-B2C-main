'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { CHANGE_META, ME, TYPE_META, VERSION_PATTERN, compareVersions, cx, parseChanges } from '../lib/shared';
import type { Release, ReleaseInput, ReleaseType } from '../lib/types';
import styles from './ReleaseModal.module.css';

interface ReleaseModalProps {
  existing: Release[];
  owners: string[];
  onCancel: () => void;
  onSubmit: (input: ReleaseInput) => void;
}

type Errors = Partial<Record<'version' | 'title' | 'changes', string>>;

function suggestVersion(existing: Release[]) {
  const now = new Date();
  const month = `${now.getFullYear()}.${now.getMonth() + 1}`;
  const same = existing.map((item) => item.version).filter((version) => version.startsWith(`${month}.`) || version.startsWith(`${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.`));
  const patch = same.length ? Math.max(...same.map((version) => Number(version.split('.')[2]))) + 1 : 1;
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${patch}`;
}

export function ReleaseModal({ existing, owners, onCancel, onSubmit }: ReleaseModalProps) {
  const [version, setVersion] = useState(() => suggestVersion(existing));
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReleaseType>('feature');
  const [owner, setOwner] = useState(ME);
  const [changesText, setChangesText] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const preview = useMemo(() => parseChanges(changesText), [changesText]);
  const highest = useMemo(() => existing.map((item) => item.version).sort(compareVersions).pop() ?? null, [existing]);

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
    const v = version.trim();
    if (!VERSION_PATTERN.test(v)) next.version = 'Use YYYY.MM.N, e.g. 2026.10.5';
    else if (existing.some((item) => compareVersions(item.version, v) === 0)) next.version = 'This version already exists';
    else if (highest && compareVersions(v, highest) < 0) next.version = `Must be newer than ${highest}`;
    if (title.trim().length < 5) next.title = 'Give the release a title of at least 5 characters';
    if (preview.length === 0) next.changes = 'List at least one change';
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    onSubmit({ version: v, title: title.trim(), type, owner, changes: preview });
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="release-modal-title">
        <div className={styles.modalHead}>
          <h2 id="release-modal-title" className={styles.modalTitle}>
            New release
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="rel-version" className={styles.label}>
                Version<span className={styles.required}> *</span>
              </label>
              <input
                id="rel-version"
                className={cx(styles.control, styles.mono, errors.version && styles.controlError)}
                value={version}
                onChange={(event) => {
                  setVersion(event.target.value);
                  clear('version');
                }}
                aria-invalid={errors.version ? true : undefined}
                aria-describedby="rel-version-msg"
              />
              <p id="rel-version-msg" className={errors.version ? styles.errorText : styles.hint}>
                {errors.version || (highest ? `Latest is ${highest}` : 'YYYY.MM.N')}
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="rel-type" className={styles.label}>
                Type
              </label>
              <select id="rel-type" className={styles.control} value={type} onChange={(event) => setType(event.target.value as ReleaseType)}>
                {Object.entries(TYPE_META).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="rel-title" className={styles.label}>
                Title<span className={styles.required}> *</span>
              </label>
              <input
                id="rel-title"
                ref={titleRef}
                className={cx(styles.control, errors.title && styles.controlError)}
                placeholder="e.g. Faster judge queue and new Go runtime"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clear('title');
                }}
                aria-invalid={errors.title ? true : undefined}
                aria-describedby="rel-title-msg"
              />
              {errors.title && (
                <p id="rel-title-msg" className={styles.errorText}>
                  {errors.title}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="rel-owner" className={styles.label}>
                Release owner
              </label>
              <select id="rel-owner" className={styles.control} value={owner} onChange={(event) => setOwner(event.target.value)}>
                {owners.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </div>

            <div className={cx(styles.field, styles.wide)}>
              <label htmlFor="rel-changes" className={styles.label}>
                Changes<span className={styles.required}> *</span>
              </label>
              <textarea
                id="rel-changes"
                className={cx(styles.control, errors.changes && styles.controlError)}
                rows={5}
                placeholder={'added: Go 1.23 runtime\nfixed: Timer reset after reconnect\nFaster queue assignment'}
                value={changesText}
                onChange={(event) => {
                  setChangesText(event.target.value);
                  clear('changes');
                }}
                aria-invalid={errors.changes ? true : undefined}
                aria-describedby="rel-changes-msg"
              />
              <p id="rel-changes-msg" className={errors.changes ? styles.errorText : styles.hint}>
                {errors.changes || 'One change per line. Start with "added:" or "fixed:" — anything else counts as changed.'}
              </p>
              {preview.length > 0 && (
                <ul className={styles.preview}>
                  {preview.map((change, index) => (
                    <li key={`${change.text}-${index}`}>
                      <span className={cx(styles.kind, styles[`kind_${CHANGE_META[change.kind].tone}`])}>{CHANGE_META[change.kind].label}</span>
                      {change.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className={styles.hint}>The release starts as a draft. Complete the checklist before scheduling or rolling it out.</p>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton}>
              Create draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}