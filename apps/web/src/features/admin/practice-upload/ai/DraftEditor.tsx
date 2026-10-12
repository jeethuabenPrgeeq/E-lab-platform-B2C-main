'use client';

import { useEffect, useRef, useState } from 'react';
import { DIFFICULTIES, HIDDEN_TEST_SLOTS } from '../schema';
import { capitalize, cx } from './helpers';
import styles from './ai.module.css';

const SLOTS = Array.from({ length: HIDDEN_TEST_SLOTS }, (_, index) => index + 1);

const FIELDS: { key: string; label: string; multiline?: boolean; mono?: boolean; wide?: boolean }[] = [
  { key: 'problem_id', label: 'Problem ID' },
  { key: 'title', label: 'Title' },
  { key: 'short_name', label: 'Short name' },
  { key: 'topic', label: 'Topic' },
  { key: 'description', label: 'Description', multiline: true, wide: true },
  { key: 'logic_constraints', label: 'Logic constraints', multiline: true },
  { key: 'input_format', label: 'Input format', multiline: true },
  { key: 'output_format', label: 'Output format', multiline: true },
  { key: 'example_input', label: 'Example input', multiline: true, mono: true },
  { key: 'expected_output', label: 'Expected output', multiline: true, mono: true },
  { key: 'maximum_test_cases', label: 'Maximum test cases' },
  { key: 'expected_complexity', label: 'Expected complexity' },
  { key: 'edge_cases', label: 'Edge cases' },
  { key: 'skills_covered', label: 'Skills covered' },
  { key: 'tags', label: 'Tags' },
];

interface DraftEditorProps {
  rowNumber: number;
  values: Record<string, string>;
  onCancel: () => void;
  onSave: (values: Record<string, string>) => void;
}

export function DraftEditor({ rowNumber, values, onCancel, onSave }: DraftEditorProps) {
  const [form, setForm] = useState<Record<string, string>>(values);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    panelRef.current?.querySelector<HTMLInputElement>('#edit-title')?.focus({ preventScroll: true });
  }, []);

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    const filled = SLOTS.filter(
      (slot) => form[`hidden_test_case_${slot}`]?.trim() && form[`hidden_expected_output_${slot}`]?.trim(),
    ).length;
    onSave({ ...form, hidden_test_case_count: String(filled) });
  };

  const field = (key: string, label: string, options: { multiline?: boolean; mono?: boolean; wide?: boolean } = {}) => {
    const id = `edit-${key}`;
    return (
      <div key={key} className={cx(styles.field, options.wide && styles.editWide)}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {options.multiline ? (
          <textarea
            id={id}
            rows={key === 'description' ? 3 : 2}
            className={cx(styles.input, options.mono && styles.mono)}
            value={form[key] ?? ''}
            onChange={(event) => set(key, event.target.value)}
          />
        ) : (
          <input id={id} type="text" className={styles.input} value={form[key] ?? ''} onChange={(event) => set(key, event.target.value)} />
        )}
      </div>
    );
  };

  return (
    <section ref={panelRef} className={styles.editorPanel} aria-labelledby="draft-editor-title">
      <h3 id="draft-editor-title" className={styles.editorTitle}>{`Edit row ${rowNumber}`}</h3>
      <div className={styles.editGrid}>
        {FIELDS.slice(0, 4).map((item) => field(item.key, item.label, item))}
        <div className={styles.field}>
          <label htmlFor="edit-difficulty" className={styles.label}>
            Difficulty
          </label>
          <select
            id="edit-difficulty"
            className={styles.input}
            value={form.difficulty ?? ''}
            onChange={(event) => set('difficulty', event.target.value)}
          >
            {DIFFICULTIES.map((level) => (
              <option key={level} value={capitalize(level)}>
                {capitalize(level)}
              </option>
            ))}
          </select>
        </div>
        {FIELDS.slice(4).map((item) => field(item.key, item.label, item))}
      </div>
      <div className={styles.editTests}>
        {SLOTS.map((slot) => (
          <fieldset key={slot} className={styles.editTest}>
            <legend className={styles.label}>{`Hidden test ${slot}`}</legend>
            {field(`hidden_test_case_${slot}`, 'Input', { multiline: true, mono: true })}
            {field(`hidden_expected_output_${slot}`, 'Expected output', { multiline: true, mono: true })}
          </fieldset>
        ))}
      </div>
      <div className={styles.editActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={styles.primaryButton} onClick={save}>
          Save changes
        </button>
      </div>
    </section>
  );
}