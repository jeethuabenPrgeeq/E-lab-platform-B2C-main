import type {
  PracticeProblem,
} from './types';

/* =========================================================
   HELPER
========================================================= */

type GoProblemInput =
  Omit<
    PracticeProblem,
    | 'technologySlug'
    | 'workspaceType'
    | 'defaultLanguage'
    | 'allowedLanguages'
  >;

function goProblem(
  problem: GoProblemInput,
): PracticeProblem {
  return {
    ...problem,

    technologySlug:
      'go',

    workspaceType:
      'code',

    defaultLanguage:
      'go',

    allowedLanguages: [
      'go',
    ],
  };
}

/* =========================================================
   GO PROBLEMS
========================================================= */

export const goProblems:
  PracticeProblem[] = [
  /* =======================================================
     FUNDAMENTALS
  ======================================================= */

  goProblem({
    slug: 'go-hello-world',

    title: 'Hello World',

    difficulty: 'Easy',

    shortDescription: 'Write your first Go program and print text to the console.',

    problemStatement: 'Write a Go program that prints Hello, World! exactly as shown.',

    outputFormat: 'Print the text: Hello, World!',

    skills: [
      'Go Syntax',
      'fmt.Println',
    ],

    estimatedMinutes: 5,

    starterCode: `package main

import "fmt"

func main() {
	// Write your code here
}`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Expected Output',

        expectedOutput: 'Hello, World!',
      },
    ],
  }),

  goProblem({
    slug: 'go-add-two-numbers',

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
      'fmt.Scan',
      'Variables',
      'Arithmetic',
    ],

    estimatedMinutes: 10,

    starterCode: `package main

import "fmt"

func main() {
	var a, b int
	fmt.Scan(&a, &b)

	// Print the sum
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

  goProblem({
    slug: 'go-even-odd',

    title: 'Even or Odd',

    difficulty: 'Easy',

    shortDescription: 'Determine whether a number is even or odd.',

    problemStatement: 'Read an integer and print Even if it is divisible by 2, otherwise print Odd.',

    inputFormat: 'A single integer N.',

    outputFormat: 'Print Even or Odd.',

    skills: [
      'fmt.Scan',
      'if / else',
      'Modulus',
    ],

    estimatedMinutes: 10,

    starterCode: `package main

import "fmt"

func main() {
	var number int
	fmt.Scan(&number)

	// Check even or odd
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

  goProblem({
    slug: 'go-factorial',

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

    starterCode: `package main

import "fmt"

func main() {
	var n int
	fmt.Scan(&n)

	// Calculate factorial
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

  goProblem({
    slug: 'go-prime-number',

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

    starterCode: `package main

import "fmt"

func main() {
	var n int
	fmt.Scan(&n)

	// Check prime
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