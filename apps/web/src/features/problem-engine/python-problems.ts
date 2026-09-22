import type {
  PracticeProblem,
} from './types';

/* =========================================================
   HELPER
========================================================= */

type PythonProblemInput =
  Omit<
    PracticeProblem,
    | 'technologySlug'
    | 'workspaceType'
    | 'defaultLanguage'
    | 'allowedLanguages'
  >;

function pythonProblem(
  problem: PythonProblemInput,
): PracticeProblem {
  return {
    ...problem,

    technologySlug:
      'python',

    workspaceType:
      'code',

    defaultLanguage:
      'python',

    allowedLanguages: [
      'python',
    ],
  };
}

/* =========================================================
   PYTHON PROBLEMS
========================================================= */

export const pythonProblems:
  PracticeProblem[] = [
  /* =======================================================
     FUNDAMENTALS
  ======================================================= */

  pythonProblem({
    slug: 'python-hello-world',

    title: 'Hello World',

    difficulty: 'Easy',

    shortDescription: 'Write your first Python program and print text to the console.',

    problemStatement: 'Write a Python program that prints Hello, World! exactly as shown.',

    outputFormat: 'Print the text: Hello, World!',

    skills: [
      'Python Syntax',
      'print()',
    ],

    estimatedMinutes: 5,

    starterCode: `# Write your code here
`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Expected Output',

        expectedOutput: 'Hello, World!',
      },
    ],
  }),

  pythonProblem({
    slug: 'python-add-two-numbers',

    title: 'Add Two Numbers',

    difficulty: 'Easy',

    shortDescription: 'Read two integers and print their sum.',

    problemStatement: 'Read two integers A and B from standard input and print their sum.',

    inputFormat: 'Two integers A and B separated by a space.',

    outputFormat: 'Print one integer representing A + B.',

    constraints: [
      '-100000 ≤ A ≤ 100000',
      '-100000 ≤ B ≤ 100000',
    ],

    skills: [
      'input()',
      'Parsing',
      'Arithmetic',
    ],

    estimatedMinutes: 10,

    starterCode: `a, b = map(int, input().split())

# Print the sum
`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Sample 1',

        input: '5 7',

        expectedOutput: '12',
      },
    ],
  }),

  /* =======================================================
     CONDITIONS
  ======================================================= */

  pythonProblem({
    slug: 'python-even-odd',

    title: 'Even or Odd',

    difficulty: 'Easy',

    shortDescription: 'Determine whether a number is even or odd.',

    problemStatement: 'Read an integer and print Even if it is divisible by 2, otherwise print Odd.',

    inputFormat: 'A single integer N.',

    outputFormat: 'Print Even or Odd.',

    skills: [
      'input()',
      'if / else',
      'Modulus',
    ],

    estimatedMinutes: 10,

    starterCode: `number = int(input())

# Check even or odd
`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Sample 1',

        input: '8',

        expectedOutput: 'Even',
      },
    ],
  }),

  /* =======================================================
     LOOPS
  ======================================================= */

  pythonProblem({
    slug: 'python-factorial',

    title: 'Factorial',

    difficulty: 'Easy',

    shortDescription: 'Calculate the factorial of a number.',

    problemStatement: 'Read a non-negative integer N and print N factorial.',

    inputFormat: 'A single non-negative integer N.',

    outputFormat: 'Print N factorial.',

    skills: [
      'Loops',
      'Variables',
      'Arithmetic',
    ],

    estimatedMinutes: 12,

    starterCode: `n = int(input())

# Calculate factorial
`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Sample 1',

        input: '5',

        expectedOutput: '120',
      },
    ],
  }),

  pythonProblem({
    slug: 'python-prime-number',

    title: 'Prime Number',

    difficulty: 'Easy',

    shortDescription: 'Determine whether a number is prime.',

    problemStatement: 'Read an integer and print Prime if it is prime, otherwise print Not Prime.',

    inputFormat: 'A single integer N.',

    outputFormat: 'Print Prime or Not Prime.',

    skills: [
      'Loops',
      'Conditions',
      'Prime numbers',
    ],

    estimatedMinutes: 15,

    starterCode: `n = int(input())

# Check prime
`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Sample 1',

        input: '7',

        expectedOutput: 'Prime',
      },
    ],
  }),
];