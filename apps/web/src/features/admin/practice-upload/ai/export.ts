export const TEMPLATE_HEADER = [
  'problem_id',
  'title',
  'short_name',
  'topic',
  'difficulty',
  'description',
  'logic_constraints',
  'input_format',
  'output_format',
  'example_input',
  'expected_output',
  'maximum_test_cases',
  'edge_cases',
  'skills_covered',
  'expected_complexity',
  'tags',
  'hidden_test_case_count',
  'hidden_test_case_1',
  'hidden_expected_output_1',
  'hidden_test_case_2',
  'hidden_expected_output_2',
  'hidden_test_case_3',
  'hidden_expected_output_3',
] as const;

function escapeCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildTemplateRowsCsv(rows: Record<string, string>[]) {
  const lines = rows.map((row) => TEMPLATE_HEADER.map((key) => escapeCell(row[key] ?? '')).join(','));
  return `\uFEFF${[TEMPLATE_HEADER.join(','), ...lines].join('\r\n')}\r\n`;
}

export function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function csvFileName(technology: string, topic: string) {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `ai-practice-${slug(technology) || 'tech'}-${slug(topic) || 'topic'}-${date}.csv`;
}