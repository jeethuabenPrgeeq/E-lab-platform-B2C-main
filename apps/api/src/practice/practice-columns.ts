export type ColumnKind = 'text' | 'enum' | 'integer';

export interface ColumnDef {
  key: string;
  required: boolean;
  kind: ColumnKind;
  options?: readonly string[];
  unique?: boolean;
  min?: number;
  max?: number;
}

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const HIDDEN_TEST_SLOTS = 3;
export const MAX_CELL_LENGTH = 20000;

export const PRACTICE_COLUMNS: readonly ColumnDef[] = [
  { key: 'problem_id', required: true, kind: 'text', unique: true },
  { key: 'title', required: true, kind: 'text' },
  { key: 'short_name', required: true, kind: 'text', unique: true },
  { key: 'topic', required: true, kind: 'text' },
  { key: 'difficulty', required: true, kind: 'enum', options: DIFFICULTIES },
  { key: 'description', required: true, kind: 'text' },
  { key: 'logic_constraints', required: false, kind: 'text' },
  { key: 'input_format', required: true, kind: 'text' },
  { key: 'output_format', required: true, kind: 'text' },
  { key: 'example_input', required: false, kind: 'text' },
  { key: 'expected_output', required: true, kind: 'text' },
  { key: 'maximum_test_cases', required: false, kind: 'integer', min: 1 },
  { key: 'edge_cases', required: false, kind: 'text' },
  { key: 'skills_covered', required: false, kind: 'text' },
  { key: 'expected_complexity', required: false, kind: 'text' },
  { key: 'tags', required: false, kind: 'text' },
  { key: 'hidden_test_case_count', required: true, kind: 'integer', min: 1, max: HIDDEN_TEST_SLOTS },
  { key: 'hidden_test_case_1', required: true, kind: 'text' },
  { key: 'hidden_expected_output_1', required: true, kind: 'text' },
  { key: 'hidden_test_case_2', required: false, kind: 'text' },
  { key: 'hidden_expected_output_2', required: false, kind: 'text' },
  { key: 'hidden_test_case_3', required: false, kind: 'text' },
  { key: 'hidden_expected_output_3', required: false, kind: 'text' },
];