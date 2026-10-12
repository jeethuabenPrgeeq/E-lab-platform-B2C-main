'use client';

import { LoaderCircle, Pencil, RefreshCw, X } from 'lucide-react';
import type { RowIssue } from '../validate';
import { TEMPLATE_HEADER } from './export';
import { cx } from './helpers';
import styles from './ai.module.css';

export type DraftFilter = 'all' | 'error' | 'warning' | 'valid';

export interface DraftView {
  uid: string;
  row: number;
  values: Record<string, string>;
  selected: boolean;
  status: 'valid' | 'warning' | 'error';
  issues: RowIssue[];
}

interface DraftTableProps {
  views: DraftView[];
  filter: DraftFilter;
  editingUid: string | null;
  regeneratingUid: string | null;
  busy: boolean;
  onToggle: (uid: string) => void;
  onEdit: (uid: string) => void;
  onRegenerate: (uid: string) => void;
  onRemove: (uid: string) => void;
}

export function DraftTable({
  views,
  filter,
  editingUid,
  regeneratingUid,
  busy,
  onToggle,
  onEdit,
  onRegenerate,
  onRemove,
}: DraftTableProps) {
  const visible = filter === 'all' ? views : views.filter((view) => view.status === filter);
  const locked = busy || regeneratingUid !== null || editingUid !== null;

  return (
    <div className={styles.draftTableWrap}>
      <table className={styles.draftTable}>
        <thead>
          <tr>
            <th scope="col" className={cx(styles.stickyCheck, styles.colCheck)}>
              <span className={styles.srOnly}>Select</span>
            </th>
            <th scope="col" className={cx(styles.stickyRow, styles.colNum)}>
              Row
            </th>
            <th scope="col">Status</th>
            {TEMPLATE_HEADER.map((key) => (
              <th key={key} scope="col">
                {key}
              </th>
            ))}
            <th scope="col">Issues</th>
            <th scope="col" className={styles.stickyActions}>
              <span className={styles.srOnly}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr>
              <td colSpan={TEMPLATE_HEADER.length + 5} className={styles.emptyRow}>
                No rows match this filter
              </td>
            </tr>
          )}
          {visible.map((view) => {
            const regenerating = regeneratingUid === view.uid;
            return (
              <tr
                key={view.uid}
                className={cx(
                  editingUid === view.uid && styles.rowEditing,
                  regenerating && styles.rowBusy,
                  view.status === 'error' && styles.rowError,
                )}
              >
                <td className={cx(styles.stickyCheck, styles.colCheck)}>
                  <input
                    type="checkbox"
                    aria-label={`Select row ${view.row}`}
                    checked={view.selected}
                    disabled={locked || view.status === 'error'}
                    onChange={() => onToggle(view.uid)}
                  />
                </td>
                <td className={cx(styles.stickyRow, styles.colNum, styles.numCell)}>{view.row}</td>
                <td>
                  <span className={cx(styles.status, styles[`status_${view.status}`])}>{view.status}</span>
                </td>
                {TEMPLATE_HEADER.map((key) => {
                  const value = view.values[key] ?? '';
                  const mono = key.startsWith('hidden_') || key === 'example_input' || key === 'expected_output';
                  return (
                    <td key={key}>
                      <span className={cx(styles.cell, mono && styles.mono, !value && styles.cellEmpty)} title={value}>
                        {value || '—'}
                      </span>
                    </td>
                  );
                })}
                <td className={styles.issuesCell}>
                  {view.issues.length === 0 ? (
                    <span className={styles.cellEmpty}>—</span>
                  ) : (
                    <ul className={styles.issueList}>
                      {view.issues.map((issue) => (
                        <li key={`${issue.column}-${issue.message}`} className={styles[`issue_${issue.level}`]}>
                          <strong>{issue.column}</strong>: {issue.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className={styles.stickyActions}>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.iconButtonPlain}
                      aria-label={`Edit row ${view.row}`}
                      title="Edit"
                      disabled={locked}
                      onClick={() => onEdit(view.uid)}
                    >
                      <Pencil width={15} height={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButtonPlain}
                      aria-label={`Regenerate row ${view.row}`}
                      title="Regenerate"
                      disabled={locked}
                      onClick={() => onRegenerate(view.uid)}
                    >
                      {regenerating ? (
                        <LoaderCircle className={styles.spin} width={15} height={15} aria-hidden="true" />
                      ) : (
                        <RefreshCw width={15} height={15} aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      className={cx(styles.iconButtonPlain, styles.iconDanger)}
                      aria-label={`Remove row ${view.row}`}
                      title="Remove"
                      disabled={locked}
                      onClick={() => onRemove(view.uid)}
                    >
                      <X width={15} height={15} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}