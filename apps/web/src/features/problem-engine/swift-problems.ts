import type {
  PracticeProblem,
} from './types';

/* =========================================================
   HELPER
========================================================= */

type SwiftProblemInput =
  Omit<
    PracticeProblem,
    | 'technologySlug'
    | 'workspaceType'
    | 'defaultLanguage'
    | 'allowedLanguages'
  >;

function swiftProblem(
  problem: SwiftProblemInput,
): PracticeProblem {
  return {
    ...problem,

    technologySlug:
      'swift',

    workspaceType:
      'code',

    defaultLanguage:
      'swift',

    allowedLanguages: [
      'swift',
    ],
  };
}

/* =========================================================
   SWIFT PROBLEMS
========================================================= */

export const swiftProblems:
  PracticeProblem[] = [
  /* =======================================================
     FUNDAMENTALS
  ======================================================= */

  swiftProblem({
    slug: 'swift-hello-world',

    title: 'Hello World',

    difficulty: 'Easy',

    shortDescription: 'Write your first Swift program and print text to the console.',

    problemStatement: 'Write a Swift program that prints Hello, World! exactly as shown.',

    outputFormat: 'Print the text: Hello, World!',

    skills: [
      'Swift Syntax',
      'print()',
    ],

    estimatedMinutes: 5,

    starterCode: `// Write your code here
`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Expected Output',

        expectedOutput: 'Hello, World!',
      },
    ],
  }),

  swiftProblem({
    slug: 'swift-add-two-numbers',

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
      'readLine()',
      'Parsing',
      'Arithmetic',
    ],

    estimatedMinutes: 10,

    starterCode: `let parts = readLine()!.split(separator: " ")
let a = Int(parts[0])!
let b = Int(parts[1])!

// Print the sum
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

  swiftProblem({
    slug: 'swift-even-odd',

    title: 'Even or Odd',

    difficulty: 'Easy',

    shortDescription: 'Determine whether a number is even or odd.',

    problemStatement: 'Read an integer and print Even if it is divisible by 2, otherwise print Odd.',

    inputFormat: 'A single integer N.',

    outputFormat: 'Print Even or Odd.',

    skills: [
      'readLine()',
      'if / else',
      'Modulus',
    ],

    estimatedMinutes: 10,

    starterCode: `let number = Int(readLine()!)!

// Check even or odd
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

  swiftProblem({
    slug: 'swift-factorial',

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

    starterCode: `let n = Int(readLine()!)!

// Calculate factorial
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

  swiftProblem({
    slug: 'swift-prime-number',

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

    starterCode: `let n = Int(readLine()!)!

// Check prime
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