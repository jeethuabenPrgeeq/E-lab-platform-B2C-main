export const RUNTIME_KINDS = ['languages', 'frameworks', 'images', 'versions'] as const;
export type RuntimeKind = (typeof RUNTIME_KINDS)[number];
export type FieldValue = string | number | boolean;

interface Field {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'select' | 'ref';
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  pattern?: [RegExp, string];
  options?: string[];
  ref?: RuntimeKind;
}

interface KindSchema {
  prefix: string;
  noun: string;
  statuses: string[];
  initial: string;
  fields: Field[];
  unique: string[];
  uniqueMessage: string;
}

export const RUNTIME_SCHEMA: Record<RuntimeKind, KindSchema> = {
  languages: {
    prefix: 'lang',
    noun: 'language',
    statuses: ['active', 'disabled'],
    initial: 'active',
    unique: ['name'],
    uniqueMessage: 'A language with this name already exists',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      { key: 'fileExtension', label: 'File extension', kind: 'text', required: true, pattern: [/^\.[a-z0-9]+$/i, 'Start with a dot, for example .py'] },
      { key: 'compileCommand', label: 'Compile command', kind: 'text' },
      { key: 'runCommand', label: 'Run command', kind: 'text', required: true },
      { key: 'timeLimitMs', label: 'Time limit (ms)', kind: 'number', required: true, min: 100, max: 20000, step: 100 },
      { key: 'memoryLimitMb', label: 'Memory limit (MB)', kind: 'number', required: true, min: 16, max: 2048, step: 16 },
    ],
  },
  frameworks: {
    prefix: 'fw',
    noun: 'framework',
    statuses: ['active', 'disabled'],
    initial: 'active',
    unique: ['name'],
    uniqueMessage: 'A framework with this name already exists',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      { key: 'language', label: 'Language', kind: 'ref', ref: 'languages', required: true },
      { key: 'testRunner', label: 'Test runner', kind: 'text', required: true },
      { key: 'version', label: 'Version', kind: 'text', required: true },
    ],
  },
  images: {
    prefix: 'img',
    noun: 'image',
    statuses: ['ready', 'pulling', 'failed'],
    initial: 'pulling',
    unique: ['name', 'tag'],
    uniqueMessage: 'This image and tag already exist',
    fields: [
      { key: 'name', label: 'Image', kind: 'text', required: true, pattern: [/^[a-z0-9]+([._\-/][a-z0-9]+)*$/, 'Lowercase letters, numbers, / . _ - only'] },
      { key: 'tag', label: 'Tag', kind: 'text', required: true, pattern: [/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/, 'Letters, numbers, . _ - only'] },
      { key: 'purpose', label: 'Used for', kind: 'select', required: true, options: ['judge', 'terminal'] },
      { key: 'sizeMb', label: 'Size (MB)', kind: 'number', required: true, min: 1, max: 20000, step: 1 },
      { key: 'cpuLimit', label: 'CPU limit (cores)', kind: 'number', required: true, min: 0.25, max: 8, step: 0.25 },
      { key: 'memoryMb', label: 'Memory limit (MB)', kind: 'number', required: true, min: 64, max: 8192, step: 64 },
    ],
  },
  versions: {
    prefix: 'ver',
    noun: 'version',
    statuses: ['active', 'deprecated'],
    initial: 'active',
    unique: ['language', 'version'],
    uniqueMessage: 'This language already has this version',
    fields: [
      { key: 'language', label: 'Language', kind: 'ref', ref: 'languages', required: true },
      { key: 'version', label: 'Version', kind: 'text', required: true },
      { key: 'image', label: 'Docker image', kind: 'ref', ref: 'images', required: true },
    ],
  },
};

const day = (n: number) => new Date(Date.now() - n * 86_400_000);

export const RUNTIME_SEED: { id: string; kind: RuntimeKind; status: string; data: Record<string, FieldValue>; at: Date }[] = [
  { id: 'lang-c', kind: 'languages', status: 'active', at: day(2), data: { name: 'C', fileExtension: '.c', compileCommand: 'gcc -O2 -std=c17 -o main main.c', runCommand: './main', timeLimitMs: 2000, memoryLimitMb: 128 } },
  { id: 'lang-cpp', kind: 'languages', status: 'active', at: day(2), data: { name: 'C++', fileExtension: '.cpp', compileCommand: 'g++ -O2 -std=c++20 -o main main.cpp', runCommand: './main', timeLimitMs: 2000, memoryLimitMb: 128 } },
  { id: 'lang-java', kind: 'languages', status: 'active', at: day(3), data: { name: 'Java', fileExtension: '.java', compileCommand: 'javac Main.java', runCommand: 'java Main', timeLimitMs: 4000, memoryLimitMb: 512 } },
  { id: 'lang-csharp', kind: 'languages', status: 'active', at: day(3), data: { name: 'C#', fileExtension: '.cs', compileCommand: 'dotnet build', runCommand: 'dotnet run', timeLimitMs: 5000, memoryLimitMb: 512 } },
  { id: 'lang-python', kind: 'languages', status: 'active', at: day(4), data: { name: 'Python', fileExtension: '.py', compileCommand: '', runCommand: 'python3 main.py', timeLimitMs: 5000, memoryLimitMb: 256 } },
  { id: 'lang-go', kind: 'languages', status: 'active', at: day(5), data: { name: 'Go', fileExtension: '.go', compileCommand: 'go build -o main main.go', runCommand: './main', timeLimitMs: 2000, memoryLimitMb: 256 } },
  { id: 'lang-ruby', kind: 'languages', status: 'active', at: day(6), data: { name: 'Ruby', fileExtension: '.rb', compileCommand: '', runCommand: 'ruby main.rb', timeLimitMs: 5000, memoryLimitMb: 256 } },
  { id: 'lang-swift', kind: 'languages', status: 'active', at: day(6), data: { name: 'Swift', fileExtension: '.swift', compileCommand: 'swiftc -O -o main main.swift', runCommand: './main', timeLimitMs: 4000, memoryLimitMb: 512 } },
  { id: 'img-gcc', kind: 'images', status: 'ready', at: day(1), data: { name: 'elab/gcc', tag: '13.2', purpose: 'judge', sizeMb: 1180, cpuLimit: 0.5, memoryMb: 512 } },
  { id: 'img-jdk', kind: 'images', status: 'ready', at: day(2), data: { name: 'elab/temurin', tag: '21', purpose: 'judge', sizeMb: 460, cpuLimit: 0.5, memoryMb: 768 } },
  { id: 'img-python', kind: 'images', status: 'ready', at: day(2), data: { name: 'elab/python', tag: '3.12', purpose: 'judge', sizeMb: 1020, cpuLimit: 0.5, memoryMb: 512 } },
  { id: 'img-terminal', kind: 'images', status: 'ready', at: day(4), data: { name: 'elab/terminal', tag: '24.04', purpose: 'terminal', sizeMb: 310, cpuLimit: 0.5, memoryMb: 256 } },
  { id: 'ver-c-13', kind: 'versions', status: 'active', at: day(2), data: { language: 'lang-c', version: 'GCC 13.2', image: 'img-gcc', isDefault: true } },
  { id: 'ver-cpp-13', kind: 'versions', status: 'active', at: day(2), data: { language: 'lang-cpp', version: 'C++20 / GCC 13.2', image: 'img-gcc', isDefault: true } },
  { id: 'ver-java-21', kind: 'versions', status: 'active', at: day(3), data: { language: 'lang-java', version: '21 LTS', image: 'img-jdk', isDefault: true } },
  { id: 'ver-py-312', kind: 'versions', status: 'active', at: day(3), data: { language: 'lang-python', version: '3.12', image: 'img-python', isDefault: true } },
];

export function validateRuntime(kind: RuntimeKind, input: Record<string, unknown>, exists: (kind: RuntimeKind, id: string) => boolean) {
  const schema = RUNTIME_SCHEMA[kind];
  const values: Record<string, FieldValue> = {};
  const issues: Record<string, string> = {};
  for (const field of schema.fields) {
    const raw = input[field.key];
    const empty = raw === undefined || raw === null || raw === '';
    if (empty) {
      if (field.required) issues[field.key] = `${field.label} is required`;
      else if (field.kind === 'text') values[field.key] = '';
      continue;
    }
    if (field.kind === 'number') {
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(value) || value < field.min! || value > field.max!) {
        issues[field.key] = `From ${field.min} to ${field.max}`;
        continue;
      }
      if (field.step && Math.abs(Math.round(value / field.step) * field.step - value) > 1e-9) {
        issues[field.key] = `Use steps of ${field.step}`;
        continue;
      }
      values[field.key] = value;
      continue;
    }
    const text = String(raw).trim();
    if (text.length > 200) issues[field.key] = 'Keep it under 200 characters';
    else if (field.pattern && !field.pattern[0].test(text)) issues[field.key] = field.pattern[1];
    else if (field.options && !field.options.includes(text)) issues[field.key] = `Pick one of: ${field.options.join(', ')}`;
    else if (field.ref && !exists(field.ref, text)) issues[field.key] = `Unknown ${RUNTIME_SCHEMA[field.ref].noun}`;
    else values[field.key] = text;
  }
  return { values, issues };
}