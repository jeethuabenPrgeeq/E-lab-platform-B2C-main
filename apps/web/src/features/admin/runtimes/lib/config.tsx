import type { ReactNode } from 'react';
import { formatSize, imageRef } from './shared';
import type { FieldDef, RuntimeKind, RuntimeRecord, RuntimeStore, SelectOption, StatusDef } from './types';

export interface ColumnDef {
  key: string;
  label: string;
  align?: 'center';
  render: (row: RuntimeRecord, store: RuntimeStore) => ReactNode;
}

export interface FilterDef {
  key: string;
  label: string;
  options: (store: RuntimeStore) => SelectOption[];
}

export interface ToggleDef {
  on: string;
  off: string;
  offLabel: string;
  onLabel: string;
}

export interface RuntimeConfig {
  title: string;
  subtitle: string;
  noun: string;
  primaryLabel: string;
  searchPlaceholder: string;
  search: (row: RuntimeRecord, store: RuntimeStore) => string;
  uniqueKeys: string[][];
  uniqueMessage: string;
  statuses: StatusDef[];
  fields: FieldDef[];
  columns: ColumnDef[];
  filters: FilterDef[];
  toggle?: ToggleDef;
  stats: (rows: RuntimeRecord[]) => { label: string; value: number }[];
  primary: (row: RuntimeRecord, store: RuntimeStore) => { title: string; sub?: string };
}

const nameOf = (store: RuntimeStore, kind: RuntimeKind, id: unknown) => {
  const found = store[kind].find((item) => item.id === id);
  if (!found) return '—';
  return kind === 'images' ? imageRef(found) : String(found.name);
};

const languageOptions = (store: RuntimeStore): SelectOption[] =>
  store.languages.map((item) => ({ value: item.id, label: String(item.name) }));

const imageOptions = (store: RuntimeStore): SelectOption[] =>
  store.images.map((item) => ({ value: item.id, label: imageRef(item) }));

const count = (rows: RuntimeRecord[], test: (row: RuntimeRecord) => boolean) => rows.filter(test).length;

const ON_OFF: StatusDef[] = [
  { value: 'active', label: 'Active', tone: 'success' },
  { value: 'disabled', label: 'Disabled', tone: 'neutral' },
];

export const RUNTIME_CONFIG: Record<RuntimeKind, RuntimeConfig> = {
  languages: {
    title: 'Languages',
    primaryLabel: 'Language',
    subtitle: 'Compile and run commands the judge uses for each language',
    noun: 'language',
    searchPlaceholder: 'Search by name or command',
    search: (row) => `${row.name} ${row.compileCommand} ${row.runCommand}`,
    uniqueKeys: [['name']],
    uniqueMessage: 'A language with this name already exists',
    statuses: ON_OFF,
    toggle: { on: 'active', off: 'disabled', onLabel: 'Enable', offLabel: 'Disable' },
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'e.g. Python' },
      {
        key: 'fileExtension',
        label: 'File extension',
        kind: 'text',
        required: true,
        mono: true,
        placeholder: '.py',
        pattern: { regex: /^\.[a-z0-9]+$/i, message: 'Start with a dot, for example .py' },
      },
      {
        key: 'compileCommand',
        label: 'Compile command',
        kind: 'text',
        mono: true,
        wide: true,
        placeholder: 'gcc -O2 -o main main.c',
        hint: 'Leave empty for interpreted languages',
      },
      { key: 'runCommand', label: 'Run command', kind: 'text', required: true, mono: true, wide: true, placeholder: 'python3 main.py' },
      { key: 'timeLimitMs', label: 'Time limit (ms)', kind: 'number', required: true, min: 100, max: 20000, step: 100 },
      { key: 'memoryLimitMb', label: 'Memory limit (MB)', kind: 'number', required: true, min: 16, max: 2048, step: 16 },
    ],
    filters: [],
    columns: [
      {
        key: 'commands',
        label: 'Commands',
        render: (row) => (
          <>
            <code data-mono>{String(row.compileCommand || 'No compile step')}</code>
            <code data-mono data-muted>
              {String(row.runCommand)}
            </code>
          </>
        ),
      },
      { key: 'ext', label: 'Extension', render: (row) => <code data-mono>{String(row.fileExtension)}</code> },
      { key: 'limits', label: 'Limits', render: (row) => `${Number(row.timeLimitMs) / 1000}s · ${row.memoryLimitMb} MB` },
    ],
    stats: (rows) => [
      { label: 'Languages', value: rows.length },
      { label: 'Active', value: count(rows, (row) => row.status === 'active') },
      { label: 'Compiled', value: count(rows, (row) => Boolean(row.compileCommand)) },
    ],
    primary: (row) => ({ title: String(row.name) }),
  },

  frameworks: {
    title: 'Frameworks',
    primaryLabel: 'Framework',
    subtitle: 'Frameworks and the test runners used to judge them',
    noun: 'framework',
    searchPlaceholder: 'Search by name or test runner',
    search: (row) => `${row.name} ${row.testRunner}`,
    uniqueKeys: [['name']],
    uniqueMessage: 'A framework with this name already exists',
    statuses: ON_OFF,
    toggle: { on: 'active', off: 'disabled', onLabel: 'Enable', offLabel: 'Disable' },
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'e.g. Spring Boot' },
      { key: 'language', label: 'Language', kind: 'select', required: true, options: languageOptions },
      { key: 'testRunner', label: 'Test runner', kind: 'text', required: true, placeholder: 'e.g. JUnit 5' },
      { key: 'version', label: 'Version', kind: 'text', required: true, mono: true, placeholder: '3.3' },
    ],
    filters: [{ key: 'language', label: 'All languages', options: languageOptions }],
    columns: [
      { key: 'language', label: 'Language', render: (row, store) => <span data-tag>{nameOf(store, 'languages', row.language)}</span> },
      { key: 'testRunner', label: 'Test runner', render: (row) => String(row.testRunner) },
      { key: 'version', label: 'Version', render: (row) => <code data-mono>{String(row.version)}</code> },
    ],
    stats: (rows) => [
      { label: 'Frameworks', value: rows.length },
      { label: 'Active', value: count(rows, (row) => row.status === 'active') },
      { label: 'Languages covered', value: new Set(rows.map((row) => row.language)).size },
    ],
    primary: (row) => ({ title: String(row.name) }),
  },

  images: {
    title: 'Docker Images',
    primaryLabel: 'Image',
    subtitle: 'Sandbox images for running submissions and live terminals',
    noun: 'image',
    searchPlaceholder: 'Search by image or tag',
    search: (row) => imageRef(row),
    uniqueKeys: [['name', 'tag']],
    uniqueMessage: 'This image and tag already exist',
    statuses: [
      { value: 'ready', label: 'Ready', tone: 'success' },
      { value: 'pulling', label: 'Pulling', tone: 'primary' },
      { value: 'failed', label: 'Pull failed', tone: 'danger' },
    ],
    fields: [
      {
        key: 'name',
        label: 'Image',
        kind: 'text',
        required: true,
        mono: true,
        placeholder: 'elab/python',
        pattern: { regex: /^[a-z0-9]+([._\-/][a-z0-9]+)*$/, message: 'Lowercase letters, numbers, / . _ - only' },
      },
      {
        key: 'tag',
        label: 'Tag',
        kind: 'text',
        required: true,
        mono: true,
        placeholder: '3.12',
        pattern: { regex: /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/, message: 'Letters, numbers, . _ - only' },
      },
      {
        key: 'purpose',
        label: 'Used for',
        kind: 'select',
        required: true,
        options: () => [
          { value: 'judge', label: 'Judge (submissions)' },
          { value: 'terminal', label: 'Live terminal' },
        ],
      },
      { key: 'sizeMb', label: 'Size (MB)', kind: 'number', required: true, min: 1, max: 20000, step: 1 },
      { key: 'cpuLimit', label: 'CPU limit (cores)', kind: 'number', required: true, min: 0.25, max: 8, step: 0.25 },
      { key: 'memoryMb', label: 'Memory limit (MB)', kind: 'number', required: true, min: 64, max: 8192, step: 64 },
    ],
    filters: [
      {
        key: 'purpose',
        label: 'All uses',
        options: () => [
          { value: 'judge', label: 'Judge' },
          { value: 'terminal', label: 'Terminal' },
        ],
      },
    ],
    columns: [
      { key: 'purpose', label: 'Used for', render: (row) => <span data-tag>{row.purpose === 'terminal' ? 'Terminal' : 'Judge'}</span> },
      { key: 'size', label: 'Size', render: (row) => formatSize(Number(row.sizeMb)) },
      { key: 'limits', label: 'Limits', render: (row) => `${row.cpuLimit} CPU · ${row.memoryMb} MB` },
    ],
    stats: (rows) => [
      { label: 'Images', value: rows.length },
      { label: 'Ready', value: count(rows, (row) => row.status === 'ready') },
      { label: 'Need attention', value: count(rows, (row) => row.status === 'failed') },
    ],
    primary: (row) => ({ title: imageRef(row) }),
  },

  versions: {
    title: 'Runtime Versions',
    primaryLabel: 'Version',
    subtitle: 'Which version each language runs, and which one is the default',
    noun: 'version',
    searchPlaceholder: 'Search by version',
    search: (row, store) => `${row.version} ${nameOf(store, 'languages', row.language)}`,
    uniqueKeys: [['language', 'version']],
    uniqueMessage: 'This language already has this version',
    statuses: [
      { value: 'active', label: 'Active', tone: 'success' },
      { value: 'deprecated', label: 'Deprecated', tone: 'warning' },
    ],
    toggle: { on: 'active', off: 'deprecated', onLabel: 'Restore', offLabel: 'Deprecate' },
    fields: [
      { key: 'language', label: 'Language', kind: 'select', required: true, options: languageOptions },
      { key: 'version', label: 'Version', kind: 'text', required: true, mono: true, placeholder: '3.12' },
      { key: 'image', label: 'Docker image', kind: 'select', required: true, wide: true, options: imageOptions },
    ],
    filters: [{ key: 'language', label: 'All languages', options: languageOptions }],
    columns: [
      { key: 'language', label: 'Language', render: (row, store) => <span data-tag>{nameOf(store, 'languages', row.language)}</span> },
      { key: 'image', label: 'Image', render: (row, store) => <code data-mono>{nameOf(store, 'images', row.image)}</code> },
    ],
    stats: (rows) => [
      { label: 'Versions', value: rows.length },
      { label: 'Defaults', value: count(rows, (row) => Boolean(row.isDefault)) },
      { label: 'Deprecated', value: count(rows, (row) => row.status === 'deprecated') },
    ],
    primary: (row, store) => ({ title: String(row.version), sub: nameOf(store, 'languages', row.language) }),
  },
};