import { HIDDEN_TEST_SLOTS, PRACTICE_COLUMNS, type ColumnDef } from './schema';

export type IssueLevel = 'error' | 'warning';

export interface RowIssue {
  row: number;
  column: string;
  level: IssueLevel;
  message: string;
}

export interface PreviewRow {
  row: number;
  values: Record<string, string>;
  status: 'valid' | 'warning' | 'error';
  issues: RowIssue[];
}

export interface ValidationSummary {
  fileName: string;
  technology: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  validatedAt: string;
}

export interface ValidationResult {
  headerErrors: string[];
  rows: PreviewRow[];
  summary: ValidationSummary;
}

function normalizeHeader(cell: string) {
  return cell.trim().toLowerCase().replace(/\s+/g, '_');
}

function checkCell(column: ColumnDef, raw: string): Omit<RowIssue, 'row'> | null {
  const value = raw.trim();
  if (!value) {
    return column.required ? { column: column.key, level: 'error', message: 'Required value is missing' } : null;
  }
  if (column.kind === 'enum' && !column.options?.includes(value.toLowerCase())) {
    return { column: column.key, level: 'error', message: `Must be one of: ${column.options?.join(', ')}` };
  }
  if (column.kind === 'integer') {
    const num = Number(value);
    if (!Number.isInteger(num)) {
      return { column: column.key, level: 'error', message: 'Must be a whole number' };
    }
    if ((column.min !== undefined && num < column.min) || (column.max !== undefined && num > column.max)) {
      const range = column.max !== undefined ? `${column.min ?? 0}–${column.max}` : `at least ${column.min}`;
      return { column: column.key, level: 'error', message: `Must be ${range}` };
    }
  }
  return null;
}

function checkHiddenTests(values: Record<string, string>): Omit<RowIssue, 'row'>[] {
  const issues: Omit<RowIssue, 'row'>[] = [];
  let filled = 0;
  for (let slot = 1; slot <= HIDDEN_TEST_SLOTS; slot++) {
    const input = values[`hidden_test_case_${slot}`] ?? '';
    const output = values[`hidden_expected_output_${slot}`] ?? '';
    if (input && !output) {
      issues.push({ column: `hidden_expected_output_${slot}`, level: 'error', message: 'Expected output missing for this hidden test' });
    } else if (!input && output) {
      issues.push({ column: `hidden_test_case_${slot}`, level: 'error', message: 'Input missing for this expected output' });
    }
    if (input && output) filled++;
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

export function validateRows(table: string[][], fileName: string, technology: string): ValidationResult {
  const [headerRow = [], ...dataRows] = table;
  const header = headerRow.map(normalizeHeader);
  const expected = PRACTICE_COLUMNS.map((column) => column.key);

  const missing = expected.filter((key) => !header.includes(key));
  const unknown = header.filter((key) => key && !expected.includes(key));
  const duplicates = header.filter((key, index) => key && header.indexOf(key) !== index);
  const headerErrors = [
    ...(missing.length ? [`Missing columns: ${missing.join(', ')}`] : []),
    ...(unknown.length ? [`Unknown columns: ${unknown.join(', ')}`] : []),
    ...(duplicates.length ? [`Duplicate columns: ${[...new Set(duplicates)].join(', ')}`] : []),
  ];

  const rows: PreviewRow[] = [];
  const uniqueColumns = PRACTICE_COLUMNS.filter((column) => column.unique);
  const seen = new Map<string, Map<string, number>>(uniqueColumns.map((column) => [column.key, new Map()]));

  if (headerErrors.length === 0) {
    dataRows.forEach((cells, index) => {
      const rowNumber = index + 2;
      const values: Record<string, string> = {};
      header.forEach((key, col) => {
        values[key] = (cells[col] ?? '').trim();
      });

      const rowIssues: RowIssue[] = [];
      const push = (issue: Omit<RowIssue, 'row'>) => rowIssues.push({ ...issue, row: rowNumber });

      if (cells.length !== header.length) {
        push({ column: '—', level: 'error', message: `Expected ${header.length} cells, found ${cells.length}` });
      }
      for (const column of PRACTICE_COLUMNS) {
        const issue = checkCell(column, values[column.key] ?? '');
        if (issue) push(issue);
      }
      checkHiddenTests(values).forEach((issue) => {
        if (!rowIssues.some((existing) => existing.column === issue.column && existing.level === 'error')) push(issue);
      });

      for (const column of uniqueColumns) {
        const value = values[column.key]?.toLowerCase();
        if (!value) continue;
        const firstRow = seen.get(column.key)?.get(value);
        if (firstRow) {
          push({ column: column.key, level: 'error', message: `Duplicate of row ${firstRow}` });
        } else {
          seen.get(column.key)?.set(value, rowNumber);
        }
      }

      const status = rowIssues.some((issue) => issue.level === 'error')
        ? 'error'
        : rowIssues.length > 0
          ? 'warning'
          : 'valid';
      rows.push({ row: rowNumber, values, status, issues: rowIssues });
    });
  }

  return {
    headerErrors,
    rows,
    summary: {
      fileName,
      technology,
      totalRows: rows.length,
      validRows: rows.filter((row) => row.status === 'valid').length,
      warningRows: rows.filter((row) => row.status === 'warning').length,
      errorRows: rows.filter((row) => row.status === 'error').length,
      validatedAt: new Date().toISOString(),
    },
  };
}