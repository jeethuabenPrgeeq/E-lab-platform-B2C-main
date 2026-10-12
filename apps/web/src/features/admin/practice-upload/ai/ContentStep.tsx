'use client';

import { useState } from 'react';
import { Info, Pencil } from 'lucide-react';
import { countWords, type ExtractedSection } from '../ai-source';
import { cx, plural } from './helpers';
import styles from './ai.module.css';

interface ContentStepProps {
  sourceLabel: string;
  sections: ExtractedSection[];
  simulated: boolean;
  busy: boolean;
  onChange: (sections: ExtractedSection[]) => void;
}

export function ContentStep({ sourceLabel, sections, simulated, busy, onChange }: ContentStepProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', body: '' });

  const included = sections.filter((section) => section.included);
  const totalWords = included.reduce((sum, section) => sum + countWords(`${section.title} ${section.body}`), 0);
  const allIncluded = sections.length > 0 && included.length === sections.length;

  const update = (id: string, change: Partial<ExtractedSection>) =>
    onChange(sections.map((section) => (section.id === id ? { ...section, ...change } : section)));

  const startEdit = (section: ExtractedSection) => {
    setDraft({ title: section.title, body: section.body });
    setEditingId(section.id);
  };

  const saveEdit = () => {
    if (!editingId) return;
    update(editingId, { title: draft.title.trim() || 'Untitled section', body: draft.body.trim() });
    setEditingId(null);
  };

  return (
    <div className={styles.stepBody}>
      {simulated && (
        <div className={styles.notice} role="note">
          <Info width={16} height={16} aria-hidden="true" />
          <span>
            Sample extract. Reading PDF, Word and URL content happens on the server, which is not connected yet. HTML and
            pasted text are read for real.
          </span>
        </div>
      )}

      <div className={styles.contentStats}>
        <span>
          <strong>{`${included.length} of ${sections.length}`}</strong> sections included
        </span>
        <span>
          <strong>{totalWords.toLocaleString('en-US')}</strong> words
        </span>
        <span className={styles.contentSource} title={sourceLabel}>
          {sourceLabel}
        </span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.sectionTable}>
          <thead>
            <tr>
              <th scope="col" className={styles.colCheck}>
                <input
                  type="checkbox"
                  aria-label="Include all sections"
                  checked={allIncluded}
                  ref={(element) => {
                    if (element) element.indeterminate = included.length > 0 && !allIncluded;
                  }}
                  disabled={busy || editingId !== null}
                  onChange={() => onChange(sections.map((section) => ({ ...section, included: !allIncluded })))}
                />
              </th>
              <th scope="col" className={styles.colNum}>
                #
              </th>
              <th scope="col" className={styles.colTitle}>
                Section
              </th>
              <th scope="col">Content</th>
              <th scope="col" className={styles.colWords}>
                Words
              </th>
              <th scope="col" className={styles.colAction}>
                <span className={styles.srOnly}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, index) => {
              const editing = editingId === section.id;
              return (
                <tr key={section.id} className={cx(!section.included && styles.rowExcluded, editing && styles.rowEditing)}>
                  <td className={styles.colCheck}>
                    <input
                      type="checkbox"
                      aria-label={`Include ${section.title}`}
                      checked={section.included}
                      disabled={busy || editing}
                      onChange={() => update(section.id, { included: !section.included })}
                    />
                  </td>
                  <td className={cx(styles.colNum, styles.numCell)}>{index + 1}</td>
                  {editing ? (
                    <>
                      <td className={styles.colTitle}>
                        <input
                          type="text"
                          aria-label="Section title"
                          className={styles.input}
                          value={draft.title}
                          onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                        />
                      </td>
                      <td colSpan={2}>
                        <textarea
                          aria-label="Section content"
                          rows={4}
                          className={styles.input}
                          value={draft.body}
                          onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
                        />
                        <div className={styles.rowEditActions}>
                          <button type="button" className={styles.secondaryButton} onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                          <button type="button" className={styles.primaryButton} onClick={saveEdit}>
                            Save
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={cx(styles.colTitle, styles.titleCell)}>{section.title}</td>
                      <td>
                        <p className={styles.excerpt} title={section.body}>
                          {section.body}
                        </p>
                      </td>
                      <td className={cx(styles.colWords, styles.numCell)}>{countWords(section.body)}</td>
                    </>
                  )}
                  <td className={styles.colAction}>
                    {!editing && (
                      <button
                        type="button"
                        className={styles.iconButtonPlain}
                        aria-label={`Edit ${section.title}`}
                        disabled={busy || editingId !== null}
                        onClick={() => startEdit(section)}
                      >
                        <Pencil width={15} height={15} aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className={styles.hint}>
        {`Untick sections AI should ignore. ${plural(included.length, 'section')} will be used for generation.`}
      </p>
    </div>
  );
}