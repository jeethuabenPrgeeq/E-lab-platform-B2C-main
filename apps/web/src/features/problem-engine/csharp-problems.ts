import type {
  PracticeProblem,
} from './types';

/* =========================================================
   HELPER
========================================================= */

type CsharpProblemInput =
  Omit<
    PracticeProblem,
    | 'technologySlug'
    | 'workspaceType'
    | 'defaultLanguage'
    | 'allowedLanguages'
  >;

function csharpProblem(
  problem: CsharpProblemInput,
): PracticeProblem {
  return {
    ...problem,

    technologySlug:
      'csharp',

    workspaceType:
      'code',

    defaultLanguage:
      'csharp',

    allowedLanguages: [
      'csharp',
    ],
  };
}

/* =========================================================
   C# PROBLEMS
========================================================= */

export const csharpProblems:
  PracticeProblem[] = [
  /* =======================================================
     FUNDAMENTALS
  ======================================================= */

  csharpProblem({
    slug: 'csharp-hello-world',

    title: 'Hello World',

    difficulty: 'Easy',

    shortDescription: 'Write your first C# program and print text to the console.',

    problemStatement: 'Write a C# program that prints Hello, World! exactly as shown.',

    outputFormat: 'Print the text: Hello, World!',

    skills: [
      'C# Syntax',
      'Main method',
      'Console.WriteLine',
    ],

    estimatedMinutes: 5,

    starterCode: `using System;

class Program
{
    static void Main(string[] args)
    {
        // Write your code here
    }
}`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Expected Output',

        expectedOutput: 'Hello, World!',
      },
    ],
  }),

  csharpProblem({
    slug: 'csharp-add-two-numbers',

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
      'Console.ReadLine',
      'Parsing',
      'Arithmetic',
    ],

    estimatedMinutes: 10,

    starterCode: `using System;

class Program
{
    static void Main(string[] args)
    {
        string[] parts = Console.ReadLine().Split(' ');
        int a = int.Parse(parts[0]);
        int b = int.Parse(parts[1]);

        // Print the sum
    }
}`,

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

  csharpProblem({
    slug: 'csharp-even-odd',

    title: 'Even or Odd',

    difficulty: 'Easy',

    shortDescription: 'Determine whether a number is even or odd.',

    problemStatement: 'Read an integer and print Even if it is divisible by 2, otherwise print Odd.',

    inputFormat: 'A single integer N.',

    outputFormat: 'Print Even or Odd.',

    skills: [
      'Console.ReadLine',
      'if / else',
      'Modulus',
    ],

    estimatedMinutes: 10,

    starterCode: `using System;

class Program
{
    static void Main(string[] args)
    {
        int number = int.Parse(Console.ReadLine());

        // Check even or odd
    }
}`,

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

  csharpProblem({
    slug: 'csharp-factorial',

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

    starterCode: `using System;

class Program
{
    static void Main(string[] args)
    {
        int n = int.Parse(Console.ReadLine());

        // Calculate factorial
    }
}`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Sample 1',

        input: '5',

        expectedOutput: '120',
      },
    ],
  }),

  csharpProblem({
    slug: 'csharp-prime-number',

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

    starterCode: `using System;

class Program
{
    static void Main(string[] args)
    {
        int n = int.Parse(Console.ReadLine());

        // Check prime
    }
}`,

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