'use client';

import { useState } from 'react';
import { LoaderCircle, Pencil, RefreshCw, X } from 'lucide-react';
import { DIFFICULTIES, HIDDEN_TEST_SLOTS } from '../schema';
import type { RowIssue } from '../validate';
import { capitalize, cx, plural } from './helpers';
import styles from './ai.module.css';

const SLOTS = Array.from({ length: HIDDEN_TEST_SLOTS }, (_, index) => index + 1);

const TEXT_FIELDS: { key: string; label: string; multiline?: boolean; mono?: boolean; wide?: boolean }[] = [
  { key: 'title', label: 'Title' },
  { key: 'topic', label: 'Topic' },
  { key: 'description', label: 'Description', multiline: true, wide: true },
  { key: 'logic_constraints', label: 'Constraints', multiline: true },
  { key: 'expected_complexity', label: 'Expected complexity' },
  { key: 'input_format', label: 'Input format', multiline: true },
  { key: 'output_format', label: 'Output format', multiline: true },
  { key: 'example_input', label: 'Example input', multiline: true, mono: true },
  { key: 'expected_output', label: 'Expected output', multiline: true, mono: true },
];

export interface DraftView {
  uid: string;
  values: Record<string, string>;
  selected: boolean;
  status: 'valid' | 'warning' | 'error';
  issues: RowIssue[];
}

interface DraftCardProps {
  draft: DraftView;
  editing: boolean;
  regenerating: boolean;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (values: Record<string, string>) => void;
  onRegenerate: () => void;
  onDiscard: () => void;
}

export function DraftCard({
  draft,
  editing,
  regenerating,
  busy,
  onToggle,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onRegenerate,
  onDiscard,
}: DraftCardProps) {
  const { values } = draft;
  const [form, setForm] = useState<Record<string, string>>(values);
  const hiddenTests = SLOTS.filter((slot) => values[`hidden_test_case_${slot}`]);
  const checkboxId = `draft-${draft.uid}`;
  const locked = busy || regenerating;

  const startEdit = () => {
    setForm(values);
    onEdit();
  };

  const saveEdit = () => {
    const filled = SLOTS.filter(
      (slot) => form[`hidden_test_case_${slot}`]?.trim() && form[`hidden_expected_output_${slot}`]?.trim(),
    ).length;
    onSaveEdit({ ...form, hidden_test_case_count: String(filled) });
  };

  const field = (key: string, label: string, options: { multiline?: boolean; mono?: boolean; wide?: boolean } = {}) => {
    const id = `${draft.uid}-${key}`;
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
            onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
          />
        ) : (
          <input
            id={id}
            type="text"
            className={styles.input}
            value={form[key] ?? ''}
            onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
          />
        )}
      </div>
    );
  };

  return (
    <li className={cx(styles.draft, draft.selected && styles.draftSelected, regenerating && styles.draftBusy)}>
      <input
        id={checkboxId}
        type="checkbox"
        className={styles.draftCheck}
        checked={draft.selected}
        disabled={locked || editing || draft.status === 'error'}
        onChange={onToggle}
      />

      <div className={styles.draftBody}>
        <div className={styles.draftTop}>
          <label htmlFor={checkboxId} className={styles.draftTitle}>
            {values.title || 'Untitled problem'}
          </label>
          <span className={cx(styles.status, styles[`status_${draft.status}`])}>{draft.status}</span>
        </div>
        <p className={styles.draftMeta}>
          <span className={styles.mono}>{values.problem_id}</span>
          <span>{values.difficulty}</span>
          <span>{plural(hiddenTests.length, 'hidden test')}</span>
        </p>

        {editing ? (
          <div className={styles.editForm}>
            <div className={styles.editGrid}>
              {TEXT_FIELDS.slice(0, 2).map((item) => field(item.key, item.label, item))}
              <div className={styles.field}>
                <label htmlFor={`${draft.uid}-difficulty`} className={styles.label}>
                  Difficulty
                </label>
                <select
                  id={`${draft.uid}-difficulty`}
                  className={styles.input}
                  value={form.difficulty ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, difficulty: event.target.value }))}
                >
                  {DIFFICULTIES.map((level) => (
                    <option key={level} value={capitalize(level)}>
                      {capitalize(level)}
                    </option>
                  ))}
                </select>
              </div>
              {TEXT_FIELDS.slice(2).map((item) => field(item.key, item.label, item))}
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
              <button type="button" className={styles.secondaryButton} onClick={onCancelEdit}>
                Cancel
              </button>
              <button type="button" className={styles.primaryButton} onClick={saveEdit}>
                Save changes
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className={styles.draftDesc}>{values.description}</p>

            {draft.issues.length > 0 && (
              <ul className={styles.issueList}>
                {draft.issues.map((issue) => (
                  <li key={`${issue.column}-${issue.message}`} className={styles[`issue_${issue.level}`]}>
                    <strong>{issue.column}</strong>: {issue.message}
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.draftActions}>
              <details className={styles.details}>
                <summary>Preview</summary>
                <dl className={styles.previewGrid}>
                  <div>
                    <dt>Input format</dt>
                    <dd>{values.input_format}</dd>
                  </div>
                  <div>
                    <dt>Output format</dt>
                    <dd>{values.output_format}</dd>
                  </div>
                  <div>
                    <dt>Constraints</dt>
                    <dd>{values.logic_constraints || '—'}</dd>
                  </div>
                  <div>
                    <dt>Expected complexity</dt>
                    <dd>{values.expected_complexity || '—'}</dd>
                  </div>
                  <div>
                    <dt>Example input</dt>
                    <dd>
                      <pre className={styles.code}>{values.example_input || '—'}</pre>
                    </dd>
                  </div>
                  <div>
                    <dt>Expected output</dt>
                    <dd>
                      <pre className={styles.code}>{values.expected_output}</pre>
                    </dd>
                  </div>
                </dl>
                <table className={styles.testTable}>
                  <caption>Hidden tests</caption>
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Input</th>
                      <th scope="col">Expected output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hiddenTests.map((slot) => (
                      <tr key={slot}>
                        <td>{slot}</td>
                        <td>
                          <pre className={styles.code}>{values[`hidden_test_case_${slot}`]}</pre>
                        </td>
                        <td>
                          <pre className={styles.code}>{values[`hidden_expected_output_${slot}`]}</pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
              <div className={styles.draftButtons}>
                <button type="button" className={styles.linkButton} disabled={locked} onClick={startEdit}>
                  <Pencil width={14} height={14} aria-hidden="true" />
                  Edit
                </button>
                <button type="button" className={styles.linkButton} disabled={locked} onClick={onRegenerate}>
                  {regenerating ? (
                    <LoaderCircle className={styles.spin} width={14} height={14} aria-hidden="true" />
                  ) : (
                    <RefreshCw width={14} height={14} aria-hidden="true" />
                  )}
                  {regenerating ? 'Regenerating…' : 'Regenerate'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        className={styles.iconButton}
        aria-label={`Remove ${values.title || 'draft'}`}
        disabled={locked || editing}
        onClick={onDiscard}
      >
        <X width={16} height={16} aria-hidden="true" />
      </button>
    </li>
  );
}