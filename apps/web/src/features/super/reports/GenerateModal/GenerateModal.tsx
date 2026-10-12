'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { RANGE_LABEL, buildReport, rangeBounds, type RangeId, type ReportSources, type Template } from '../lib/templates';
import styles from '../ui/modal.module.css';

interface GenerateModalProps {
  template: Template;
  sources: ReportSources;
  onCancel: () => void;
  onSubmit: (range: RangeId | null, rows: number) => void;
}

export function GenerateModal({ template, sources, onCancel, onSubmit }: GenerateModalProps) {
  const [range, setRange] = useState<RangeId>('30d');
  const [now] = useState(() => Date.now());
  const selectRef = useRef<HTMLSelectElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    (template.snapshot ? submitRef.current : selectRef.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [template.snapshot]);

  const rows = useMemo(() => {
    const [from, to] = template.snapshot ? [now, now] : rangeBounds(range, now);
    return buildReport(template.id, from, to, sources, now);
  }, [template, range, sources, now]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(template.snapshot ? null : range, rows.length);
  };

  const preview = rows.slice(0, 3);
  const columns = template.columns.slice(0, 5);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="generate-title">
        <div className={styles.modalHead}>
          <h2 id="generate-title" className={styles.modalTitle}>
            {`Generate ${template.name}`}
          </h2>
          <button type="button" className={styles.iconButton} aria-label="Close" onClick={onCancel}>
            <X width={18} height={18} aria-hidden="true" />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <p className={styles.hint}>{template.description}</p>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="report-range" className={styles.label}>
                Covers
              </label>
              {template.snapshot ? (
                <input id="report-range" className={styles.control} value="Everything as of right now" disabled />
              ) : (
                <select id="report-range" ref={selectRef} className={styles.control} value={range} onChange={(event) => setRange(event.target.value as RangeId)}>
                  {Object.entries(RANGE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="report-format" className={styles.label}>
                Format
              </label>
              <input id="report-format" className={styles.control} value="CSV (opens in Excel or Sheets)" disabled />
            </div>
          </div>

          <div className={styles.previewBox}>
            <strong>{`${rows.length.toLocaleString('en-IN')} row${rows.length === 1 ? '' : 's'} · ${template.columns.length} columns`}</strong>
            {rows.length === 0 ? (
              <span>Nothing to report for this period — the file will only have the header row.</span>
            ) : (
              <div className={styles.previewTableWrap}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={index}>
                        {row.slice(0, columns.length).map((value, cell) => (
                          <td key={cell}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.ghostButton} onClick={onCancel}>
              Cancel
            </button>
            <button ref={submitRef} type="submit" className={styles.primaryButton}>
              Generate report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
