import type { SourceType } from './ai-source';
import { PRACTICE_COLUMNS } from './schema';

export const AI_DIFFICULTIES = ['mixed', 'easy', 'medium', 'hard'] as const;
export type AiDifficulty = (typeof AI_DIFFICULTIES)[number];

export const QUESTION_TYPES = [
  { key: 'coding', label: 'Coding problem', description: 'Write a program, judged by hidden tests', available: true },
  { key: 'mcq', label: 'Multiple choice', description: 'Needs the question bank schema', available: false },
  { key: 'output', label: 'Predict the output', description: 'Needs the question bank schema', available: false },
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number]['key'];

export const AI_MAX_COUNT = 500;

export type Level = 'easy' | 'medium' | 'hard';
export const LEVELS: Level[] = ['easy', 'medium', 'hard'];
export type LevelCounts = Record<Level, number>;

export interface AiRequest {
  technology: string;
  sourceType: SourceType;
  sourceLabel: string;
  content: string;
  focus: string[];
  topic: string;
  difficulty: AiDifficulty;
  count: number;
  mix: LevelCounts;
  questionType: QuestionType;
  instructions: string;
}

export interface GeneratedDraft {
  slug: string;
  level: Level;
  values: Record<string, string>;
}

interface Template {
  slug: string;
  title: string;
  level: Level;
  keywords: string[];
  description: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  complexity: string;
  skills: string;
  edgeCases: string;
  inputs: string[];
  solve: (input: string) => string;
}

const nums = (input: string) => input.trim().split(/\s+/).map(Number);

const TEMPLATES: Template[] = [
  {
    slug: 'sum-of-two-numbers',
    title: 'Sum of Two Numbers',
    level: 'easy',
    keywords: ['basic', 'io', 'input', 'number', 'arithmetic', 'operator'],
    description: 'Read two integers and print their sum.',
    constraints: '-10^9 <= a, b <= 10^9',
    inputFormat: 'A single line with two integers a and b separated by a space.',
    outputFormat: 'Print a + b.',
    complexity: 'O(1)',
    skills: 'Input/Output; Arithmetic',
    edgeCases: 'Negative numbers; Large values near the limits',
    inputs: ['10 20', '-5 8', '1000000000 1000000000', '0 0'],
    solve: (input) => String(nums(input).reduce((a, b) => a + b, 0)),
  },
  {
    slug: 'largest-of-three',
    title: 'Largest of Three',
    level: 'easy',
    keywords: ['basic', 'condition', 'if', 'number', 'compare', 'operator'],
    description: 'Read three integers and print the largest one.',
    constraints: '-10^6 <= a, b, c <= 10^6',
    inputFormat: 'A single line with three integers separated by spaces.',
    outputFormat: 'Print the largest integer.',
    complexity: 'O(1)',
    skills: 'Conditionals; Comparison',
    edgeCases: 'All values equal; All values negative',
    inputs: ['3 9 4', '-7 -2 -9', '5 5 5', '0 -1 1'],
    solve: (input) => String(Math.max(...nums(input))),
  },
  {
    slug: 'even-or-odd',
    title: 'Even or Odd',
    level: 'easy',
    keywords: ['basic', 'condition', 'if', 'number', 'modulo', 'operator'],
    description: 'Read an integer and print EVEN if it is even, otherwise print ODD.',
    constraints: '-10^9 <= n <= 10^9',
    inputFormat: 'A single integer n.',
    outputFormat: 'Print EVEN or ODD.',
    complexity: 'O(1)',
    skills: 'Conditionals; Modulo operator',
    edgeCases: 'Zero; Negative odd numbers',
    inputs: ['4', '7', '0', '-3'],
    solve: (input) => (Math.abs(nums(input)[0]) % 2 === 0 ? 'EVEN' : 'ODD'),
  },
  {
    slug: 'sum-of-array-elements',
    title: 'Sum of Array Elements',
    level: 'easy',
    keywords: ['array', 'loop', 'basic', 'sum'],
    description: 'Read n integers and print their sum.',
    constraints: '1 <= n <= 10^5; -10^4 <= a[i] <= 10^4',
    inputFormat: 'First line: n. Second line: n integers separated by spaces.',
    outputFormat: 'Print the sum of the n integers.',
    complexity: 'O(n)',
    skills: 'Arrays; Loops',
    edgeCases: 'Single element; All negative values',
    inputs: ['5\n1 2 3 4 5', '1\n-7', '4\n-1 -2 -3 -4', '3\n10000 10000 10000'],
    solve: (input) => {
      const [, ...values] = nums(input);
      return String(values.reduce((a, b) => a + b, 0));
    },
  },
  {
    slug: 'string-length',
    title: 'Length of a String',
    level: 'easy',
    keywords: ['string', 'character', 'basic', 'loop'],
    description: 'Read a single word and print the number of characters in it without using a built-in length function.',
    constraints: '1 <= length <= 1000; the word has no spaces',
    inputFormat: 'A single word.',
    outputFormat: 'Print the number of characters.',
    complexity: 'O(n)',
    skills: 'Strings; Loops',
    edgeCases: 'Single character; Digits and symbols in the word',
    inputs: ['hello', 'a', 'elab2026', 'programming'],
    solve: (input) => String(input.trim().length),
  },
  {
    slug: 'factorial',
    title: 'Factorial of a Number',
    level: 'easy',
    keywords: ['recursion', 'loop', 'math', 'number', 'basic'],
    description: 'Read a non-negative integer n and print n! (n factorial).',
    constraints: '0 <= n <= 20',
    inputFormat: 'A single integer n.',
    outputFormat: 'Print n!.',
    complexity: 'O(n)',
    skills: 'Recursion or loops; 64-bit integers',
    edgeCases: 'n = 0 gives 1; n = 20 needs a 64-bit type',
    inputs: ['5', '0', '1', '20'],
    solve: (input) => {
      let result = BigInt(1);
      for (let i = 2; i <= nums(input)[0]; i++) result *= BigInt(i);
      return result.toString();
    },
  },
  {
    slug: 'reverse-a-string',
    title: 'Reverse a String',
    level: 'medium',
    keywords: ['string', 'loop', 'character'],
    description: 'Read a single word and print it reversed.',
    constraints: '1 <= length <= 1000; the word has no spaces',
    inputFormat: 'A single word.',
    outputFormat: 'Print the word reversed.',
    complexity: 'O(n)',
    skills: 'Strings; Loops',
    edgeCases: 'Single character; Palindromes',
    inputs: ['hello', 'a', 'racecar', 'OpenAI2026'],
    solve: (input) => input.trim().split('').reverse().join(''),
  },
  {
    slug: 'count-vowels',
    title: 'Count Vowels',
    level: 'medium',
    keywords: ['string', 'loop', 'character', 'count'],
    description: 'Read a line of text and print how many vowels (a, e, i, o, u, case-insensitive) it contains.',
    constraints: '1 <= length <= 10^4',
    inputFormat: 'A single line of text.',
    outputFormat: 'Print the number of vowels.',
    complexity: 'O(n)',
    skills: 'Strings; Character checks',
    edgeCases: 'No vowels; Uppercase vowels',
    inputs: ['Hello World', 'rhythm', 'AEIOU aeiou', 'Programming in C'],
    solve: (input) => String((input.match(/[aeiou]/gi) ?? []).length),
  },
  {
    slug: 'second-largest-element',
    title: 'Second Largest Element',
    level: 'medium',
    keywords: ['array', 'loop', 'sort', 'search', 'number'],
    description: 'Read n integers and print the second largest distinct value. Print -1 if it does not exist.',
    constraints: '1 <= n <= 10^5; -10^9 <= a[i] <= 10^9',
    inputFormat: 'First line: n. Second line: n integers separated by spaces.',
    outputFormat: 'Print the second largest distinct value, or -1.',
    complexity: 'O(n)',
    skills: 'Arrays; Single pass tracking',
    edgeCases: 'All elements equal; Only one element',
    inputs: ['5\n4 9 2 9 7', '3\n5 5 5', '1\n42', '4\n-1 -8 -3 -2'],
    solve: (input) => {
      const [, ...values] = nums(input);
      const distinct = [...new Set(values)].sort((a, b) => b - a);
      return String(distinct[1] ?? -1);
    },
  },
  {
    slug: 'palindrome-number',
    title: 'Palindrome Number',
    level: 'medium',
    keywords: ['number', 'loop', 'digit', 'math', 'string'],
    description: 'Read a non-negative integer and print YES if it reads the same backwards, otherwise NO.',
    constraints: '0 <= n <= 10^9',
    inputFormat: 'A single integer n.',
    outputFormat: 'Print YES or NO.',
    complexity: 'O(d) where d is the number of digits',
    skills: 'Digit extraction; Loops',
    edgeCases: 'Single digit; Numbers ending in zero',
    inputs: ['121', '123', '7', '1200'],
    solve: (input) => {
      const value = input.trim();
      return value === value.split('').reverse().join('') ? 'YES' : 'NO';
    },
  },
  {
    slug: 'balanced-brackets',
    title: 'Balanced Brackets',
    level: 'hard',
    keywords: ['stack', 'string', 'bracket', 'data structure'],
    description: 'Read a string of brackets ()[]{} and print YES if every bracket is properly closed and nested, otherwise NO.',
    constraints: '1 <= length <= 10^5',
    inputFormat: 'A single line containing only the characters ()[]{}.',
    outputFormat: 'Print YES or NO.',
    complexity: 'O(n)',
    skills: 'Stacks; String scanning',
    edgeCases: 'Only opening brackets; Wrong nesting order',
    inputs: ['{[()]}', '([)]', '((((', '()[]{}'],
    solve: (input) => {
      const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
      const stack: string[] = [];
      for (const char of input.trim()) {
        if ('([{'.includes(char)) stack.push(char);
        else if (stack.pop() !== pairs[char]) return 'NO';
      }
      return stack.length === 0 ? 'YES' : 'NO';
    },
  },
  {
    slug: 'longest-increasing-subsequence',
    title: 'Longest Increasing Subsequence',
    level: 'hard',
    keywords: ['array', 'dynamic programming', 'dp', 'sequence'],
    description: 'Read n integers and print the length of the longest strictly increasing subsequence.',
    constraints: '1 <= n <= 2000; -10^9 <= a[i] <= 10^9',
    inputFormat: 'First line: n. Second line: n integers separated by spaces.',
    outputFormat: 'Print the length of the longest strictly increasing subsequence.',
    complexity: 'O(n^2) or O(n log n)',
    skills: 'Dynamic programming; Arrays',
    edgeCases: 'Strictly decreasing input; All elements equal',
    inputs: ['6\n10 9 2 5 3 7', '5\n5 4 3 2 1', '4\n2 2 2 2', '8\n0 8 4 12 2 10 6 14'],
    solve: (input) => {
      const [, ...values] = nums(input);
      const tails: number[] = [];
      for (const value of values) {
        let lo = 0;
        let hi = tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (tails[mid] < value) lo = mid + 1;
          else hi = mid;
        }
        tails[lo] = value;
      }
      return String(tails.length);
    },
  },
  {
    slug: 'nth-fibonacci',
    title: 'Nth Fibonacci Number',
    level: 'hard',
    keywords: ['recursion', 'dynamic programming', 'dp', 'math', 'number', 'loop'],
    description: 'Read n and print the nth Fibonacci number modulo 1000000007, where F(0) = 0 and F(1) = 1.',
    constraints: '0 <= n <= 10^6',
    inputFormat: 'A single integer n.',
    outputFormat: 'Print F(n) mod 1000000007.',
    complexity: 'O(n)',
    skills: 'Iteration; Modular arithmetic',
    edgeCases: 'n = 0; Large n needing the modulo',
    inputs: ['10', '0', '1', '100'],
    solve: (input) => {
      const n = nums(input)[0];
      const mod = BigInt(1000000007);
      let a = BigInt(0);
      let b = BigInt(1);
      for (let i = 0; i < n; i++) [a, b] = [b, (a + b) % mod];
      return a.toString();
    },
  },
];

const TECH_PREFIX: Record<string, string> = {
  C: 'C',
  'C++': 'CPP',
  JavaScript: 'JS',
  TypeScript: 'TS',
  Python: 'PY',
  Django: 'DJ',
  React: 'RE',
  'Next.js': 'NX',
  NestJS: 'NS',
};

function capitalize(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function relevance(template: Template, request: AiRequest) {
  const text = [request.topic, ...request.focus, request.content.slice(0, 5000)].join(' ').toLowerCase();
  return template.keywords.filter((keyword) => new RegExp(`\\b${keyword}`, 'i').test(text)).length;
}

function pickLevels(request: AiRequest): Level[] {
  if (request.difficulty !== 'mixed') return Array.from({ length: request.count }, () => request.difficulty as Level);
  return LEVELS.flatMap((level) => Array.from({ length: Math.max(0, request.mix[level]) }, () => level));
}

function buildRow(template: Template, request: AiRequest, batch: string, index: number, repeat: number) {
  const suffix = repeat > 0 ? ` ${repeat + 1}` : '';
  const [example, ...hidden] = template.inputs;
  const tests = hidden.slice(0, 3);
  const row: Record<string, string> = Object.fromEntries(PRACTICE_COLUMNS.map((column) => [column.key, '']));

  Object.assign(row, {
    problem_id: `${TECH_PREFIX[request.technology] ?? 'GEN'}-AI-${batch}-${String(index + 1).padStart(3, '0')}`,
    title: `${template.title}${suffix}`,
    short_name: `${template.slug.replace(/-/g, '_')}${repeat > 0 ? `_${repeat + 1}` : ''}_${batch.toLowerCase()}`,
    difficulty: capitalize(template.level),
    topic: request.topic.trim(),
    description: template.description,
    logic_constraints: template.constraints,
    input_format: template.inputFormat,
    output_format: template.outputFormat,
    example_input: example,
    expected_output: template.solve(example),
    maximum_test_cases: String(tests.length + 1),
    edge_cases: template.edgeCases,
    skills_covered: template.skills,
    expected_complexity: template.complexity,
    tags: [request.topic.trim().toLowerCase(), template.level, 'ai-generated', `source-${request.sourceType}`].join('; '),
    hidden_test_case_count: String(tests.length),
  });

  tests.forEach((input, slot) => {
    row[`hidden_test_case_${slot + 1}`] = input;
    row[`hidden_expected_output_${slot + 1}`] = template.solve(input);
  });

  return row;
}

function newBatch() {
  return Date.now().toString(36).slice(-4).toUpperCase();
}

function pickTemplate(level: Level, request: AiRequest, used: Map<string, number>) {
  const pool = TEMPLATES.filter((template) => template.level === level).sort(
    (a, b) => relevance(b, request) - relevance(a, request) || (used.get(a.slug) ?? 0) - (used.get(b.slug) ?? 0),
  );
  return pool.find((candidate) => !used.has(candidate.slug)) ?? pool[0];
}

export async function generateDrafts(request: AiRequest): Promise<GeneratedDraft[]> {
  await new Promise((resolve) => setTimeout(resolve, 1400));

  const batch = newBatch();
  const used = new Map<string, number>();

  return pickLevels(request).map((level, index) => {
    const template = pickTemplate(level, request, used);
    const repeat = used.get(template.slug) ?? 0;
    used.set(template.slug, repeat + 1);
    return { slug: template.slug, level, values: buildRow(template, request, batch, index, repeat) };
  });
}

export async function regenerateDraft(request: AiRequest, level: Level, existingSlugs: string[]): Promise<GeneratedDraft> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const used = new Map<string, number>();
  existingSlugs.forEach((slug) => used.set(slug, (used.get(slug) ?? 0) + 1));
  const template = pickTemplate(level, request, used);
  const repeat = used.get(template.slug) ?? 0;
  return { slug: template.slug, level, values: buildRow(template, request, newBatch(), 0, repeat) };
}