import type {
  PracticeProblem,
} from './types';

/* =========================================================
   HELPER
========================================================= */

type RubyProblemInput =
  Omit<
    PracticeProblem,
    | 'technologySlug'
    | 'workspaceType'
    | 'defaultLanguage'
    | 'allowedLanguages'
  >;

function rubyProblem(
  problem: RubyProblemInput,
): PracticeProblem {
  return {
    ...problem,

    technologySlug:
      'ruby',

    workspaceType:
      'code',

    defaultLanguage:
      'ruby',

    allowedLanguages: [
      'ruby',
    ],
  };
}

/* =========================================================
   RUBY PROBLEMS
========================================================= */

export const rubyProblems:
  PracticeProblem[] = [
  /* =======================================================
     FUNDAMENTALS
  ======================================================= */

  rubyProblem({
    slug: 'ruby-hello-world',

    title: 'Hello World',

    difficulty: 'Easy',

    shortDescription: 'Write your first Ruby program and print text to the console.',

    problemStatement: 'Write a Ruby program that prints Hello, World! exactly as shown.',

    outputFormat: 'Print the text: Hello, World!',

    skills: [
      'Ruby Syntax',
      'puts',
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

  rubyProblem({
    slug: 'ruby-add-two-numbers',

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
      'gets',
      'Parsing',
      'Arithmetic',
    ],

    estimatedMinutes: 10,

    starterCode: `a, b = gets.split.map(&:to_i)

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

  rubyProblem({
    slug: 'ruby-even-odd',

    title: 'Even or Odd',

    difficulty: 'Easy',

    shortDescription: 'Determine whether a number is even or odd.',

    problemStatement: 'Read an integer and print Even if it is divisible by 2, otherwise print Odd.',

    inputFormat: 'A single integer N.',

    outputFormat: 'Print Even or Odd.',

    skills: [
      'gets',
      'if / else',
      'Modulus',
    ],

    estimatedMinutes: 10,

    starterCode: `number = gets.to_i

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

  rubyProblem({
    slug: 'ruby-factorial',

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

    starterCode: `n = gets.to_i

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

  rubyProblem({
    slug: 'ruby-prime-number',

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

    starterCode: `n = gets.to_i

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