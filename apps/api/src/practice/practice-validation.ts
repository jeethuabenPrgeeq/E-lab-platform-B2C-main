import { HIDDEN_TEST_SLOTS, PRACTICE_COLUMNS, type ColumnDef } from './practice-columns.js';

export type RowIssue = {
  column: string;
  level: 'error' | 'warning';
  message: string;
};

export interface ExistingKeys {
  problemIds: Set<string>;
  shortNames: Set<string>;
}

export interface RowResult {
  issues: RowIssue[];
  hasError: boolean;
}

function checkCell(column: ColumnDef, value: string): RowIssue | null {
  if (!value) {
    return column.required
      ? { column: column.key, level: 'error', message: 'Required value is missing' }
      : null;
  }

  if (column.kind === 'enum' && !column.options?.includes(value.toLowerCase())) {
    return {
      column: column.key,
      level: 'error',
      message: `Must be one of: ${column.options?.join(', ')}`,
    };
  }

  if (column.kind === 'integer') {
    const num = Number(value);

    if (!Number.isInteger(num)) {
      return { column: column.key, level: 'error', message: 'Must be a whole number' };
    }

    if (
      (column.min !== undefined && num < column.min) ||
      (column.max !== undefined && num > column.max)
    ) {
      const range =
        column.max !== undefined
          ? `${column.min ?? 0}-${column.max}`
          : `at least ${column.min}`;

      return { column: column.key, level: 'error', message: `Must be ${range}` };
    }
  }

  return null;
}

function checkHiddenTests(values: Record<string, string>): RowIssue[] {
  const issues: RowIssue[] = [];
  let filled = 0;

  for (let slot = 1; slot <= HIDDEN_TEST_SLOTS; slot++) {
    const input = values[`hidden_test_case_${slot}`] ?? '';
    const output = values[`hidden_expected_output_${slot}`] ?? '';

    if (input && !output) {
      issues.push({
        column: `hidden_expected_output_${slot}`,
        level: 'error',
        message: 'Expected output missing for this hidden test',
      });
    } else if (!input && output) {
      issues.push({
        column: `hidden_test_case_${slot}`,
        level: 'error',
        message: 'Input missing for this expected output',
      });
    }

    if (input && output) {
      filled++;
    }
  }

  const declared = Number(values.hidden_test_case_count);

  if (Number.isInteger(declared) && declared !== filled) {
    issues.push({
      column: 'hidden_test_case_count',
      level: 'warning',
      message: `Says ${declared}, but ${filled} hidden test${filled === 1 ? ' is' : 's are'} filled in`,
    });
  }

  return issues;
}

export function validateRows(
  rows: Record<string, string>[],
  existing: ExistingKeys,
): RowResult[] {
  const uniqueColumns = PRACTICE_COLUMNS.filter((column) => column.unique);
  const seen = new Map<string, Map<string, number>>(
    uniqueColumns.map((column) => [column.key, new Map()]),
  );

  return rows.map((values, index) => {
    const rowNumber = index + 1;
    const issues: RowIssue[] = [];

    for (const column of PRACTICE_COLUMNS) {
      const issue = checkCell(column, values[column.key] ?? '');

      if (issue) {
        issues.push(issue);
      }
    }

    for (const issue of checkHiddenTests(values)) {
      if (!issues.some((item) => item.column === issue.column && item.level === 'error')) {
        issues.push(issue);
      }
    }

    for (const column of uniqueColumns) {
      const value = values[column.key]?.toLowerCase();

      if (!value) {
        continue;
      }

      const firstRow = seen.get(column.key)?.get(value);

      if (firstRow) {
        issues.push({
          column: column.key,
          level: 'error',
          message: `Duplicate of row ${firstRow}`,
        });
      } else {
        seen.get(column.key)?.set(value, rowNumber);
      }

      const alreadySaved =
        column.key === 'problem_id'
          ? existing.problemIds.has(value)
          : existing.shortNames.has(value);

      if (alreadySaved) {
        issues.push({
          column: column.key,
          level: 'error',
          message: 'Already used by another problem',
        });
      }
    }

    return { issues, hasError: issues.some((issue) => issue.level === 'error') };
  });
}