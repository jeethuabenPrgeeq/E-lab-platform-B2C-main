import { PRACTICE_COLUMNS } from './schema';

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (inQuotes) throw new Error('Unterminated quoted field');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

function escapeCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildTemplateCsv(technology: string): string {
  const header = PRACTICE_COLUMNS.map((column) => column.key);
  const prefix = technology.toUpperCase().replace(/[^A-Z0-9]+/g, '');
  const example: Record<string, string> = {
    problem_id: `${prefix}-001`,
    title: 'Add Two Numbers',
    short_name: 'add_two_numbers',
    topic: 'Basics',
    difficulty: 'Easy',
    description: 'Read two integers and print their sum.',
    logic_constraints: 'Use only arithmetic operators',
    input_format: 'Two space-separated integers',
    output_format: 'A single integer',
    example_input: '10 20',
    expected_output: '30',
    maximum_test_cases: '10',
    edge_cases: 'Negative numbers; zero',
    skills_covered: 'Input/Output; Arithmetic',
    expected_complexity: 'O(1)',
    hidden_test_case_count: '3',
    hidden_test_case_1: '5 8',
    hidden_expected_output_1: '13',
    hidden_test_case_2: '-4 4',
    hidden_expected_output_2: '0',
    hidden_test_case_3: '0 0',
    hidden_expected_output_3: '0',
  };
  const row = header.map((key) => escapeCell(example[key] ?? ''));
  return `${header.join(',')}\r\n${row.join(',')}\r\n`;
}

export interface ExportRow {
  row: number;
  status: string;
  values: Record<string, string>;
  issues: { column: string; message: string }[];
}

export function buildExportCsv(rows: ExportRow[]): string {
  const keys = PRACTICE_COLUMNS.map((column) => column.key);
  const header = ['row', 'status', ...keys, 'issues'];
  const lines = rows.map((row) =>
    [
      String(row.row),
      row.status,
      ...keys.map((key) => row.values[key] ?? ''),
      row.issues.map((issue) => `${issue.column}: ${issue.message}`).join(' | '),
    ]
      .map(escapeCell)
      .join(','),
  );
  return `\uFEFF${[header.join(','), ...lines].join('\r\n')}\r\n`;
}