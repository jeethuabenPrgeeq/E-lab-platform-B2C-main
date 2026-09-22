import type {
  PracticeProblem,
} from './types';

/* =========================================================
   C PROGRAMMING PROBLEMS
========================================================= */

export const cProblems:
  PracticeProblem[] = [
  /* =======================================================
     FUNDAMENTALS
  ======================================================= */

  {
    slug: 'c-hello-world',

    title: 'Hello World',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Write your first C program and print text to the console.',

    problemStatement:
      'Write a C program that prints Hello, World! exactly as shown.',

    outputFormat:
      'Print the text: Hello, World!',

    skills: [
      'C Syntax',
      'printf',
      'main Function',
    ],

    estimatedMinutes: 5,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    // Write your code here

    return 0;
}`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Expected Output',

        expectedOutput:
          'Hello, World!',
      },
    ],
  },

  {
    slug: 'c-add-two-numbers',

    title: 'Add Two Numbers',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Read two integers and print their sum.',

    problemStatement:
      'Read two integers A and B from standard input and print their sum.',

    inputFormat:
      'Two integers A and B separated by a space.',

    outputFormat:
      'Print one integer representing A + B.',

    constraints: [
      '-100000 ≤ A ≤ 100000',
      '-100000 ≤ B ≤ 100000',
    ],

    skills: [
      'scanf',
      'printf',
      'Variables',
      'Arithmetic',
    ],

    estimatedMinutes: 10,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int a;
    int b;

    scanf("%d %d", &a, &b);

    // Print the sum

    return 0;
}`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Basic Addition',

        input: '5 7',

        expectedOutput: '12',
      },
    ],
  },

  {
    slug: 'c-basic-arithmetic',

    title: 'Basic Arithmetic Operations',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Perform addition, subtraction and multiplication on two integers.',

    problemStatement:
      'Read two integers A and B. Print their sum, difference and product on separate lines.',

    inputFormat:
      'Two integers A and B.',

    outputFormat:
      'Print A+B, A-B and A*B on separate lines.',

    skills: [
      'Arithmetic Operators',
      'Input',
      'Output',
    ],

    estimatedMinutes: 10,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int a;
    int b;

    scanf("%d %d", &a, &b);

    // Write your solution

    return 0;
}`,
  },

  {
    slug: 'c-celsius-fahrenheit',

    title: 'Celsius to Fahrenheit',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Convert a Celsius temperature into Fahrenheit.',

    problemStatement:
      'Read a Celsius temperature and convert it to Fahrenheit using F = (C × 9 / 5) + 32.',

    inputFormat:
      'One floating-point number representing Celsius.',

    outputFormat:
      'Print the Fahrenheit temperature rounded to two decimal places.',

    skills: [
      'Float',
      'Arithmetic',
      'Formatted Output',
    ],

    estimatedMinutes: 10,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    double celsius;

    scanf("%lf", &celsius);

    // Convert temperature

    return 0;
}`,
  },

  /* =======================================================
     CONDITIONS
  ======================================================= */

  {
    slug: 'c-even-odd',

    title: 'Check Even or Odd',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Determine whether an integer is even or odd.',

    problemStatement:
      'Read an integer N. Print Even if N is divisible by 2. Otherwise print Odd.',

    inputFormat:
      'A single integer N.',

    outputFormat:
      'Print Even or Odd.',

    constraints: [
      '-1000000 ≤ N ≤ 1000000',
    ],

    skills: [
      'if/else',
      'Modulo Operator',
      'Input/Output',
    ],

    estimatedMinutes: 10,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    // Check even or odd

    return 0;
}`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Even Input',

        input: '8',

        expectedOutput: 'Even',
      },

      {
        id: 'sample-2',

        title: 'Odd Input',

        input: '5',

        expectedOutput: 'Odd',
      },
    ],
  },

  {
    slug: 'c-positive-negative-zero',

    title: 'Positive, Negative or Zero',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Classify an integer by its sign.',

    problemStatement:
      'Read an integer N. Print Positive when N is greater than zero, Negative when it is less than zero, otherwise print Zero.',

    inputFormat:
      'A single integer N.',

    outputFormat:
      'Print Positive, Negative or Zero.',

    skills: [
      'if',
      'else if',
      'Comparison Operators',
    ],

    estimatedMinutes: 10,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    // Write your condition

    return 0;
}`,
  },

  {
    slug: 'c-largest-two',

    title: 'Largest of Two Numbers',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Find the larger of two integers.',

    problemStatement:
      'Read two integers A and B and print the larger value.',

    inputFormat:
      'Two integers A and B.',

    outputFormat:
      'Print the larger integer.',

    skills: [
      'Conditions',
      'Comparison',
    ],

    estimatedMinutes: 10,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int a;
    int b;

    scanf("%d %d", &a, &b);

    // Find the larger number

    return 0;
}`,
  },

  {
    slug: 'c-largest-three',

    title: 'Largest of Three Numbers',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Find the largest among three integers.',

    problemStatement:
      'Read three integers and print the largest value.',

    inputFormat:
      'Three integers A, B and C.',

    outputFormat:
      'Print the largest integer.',

    skills: [
      'Conditional Statements',
      'Logical Operators',
    ],

    estimatedMinutes: 15,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int a;
    int b;
    int c;

    scanf("%d %d %d", &a, &b, &c);

    // Find the largest

    return 0;
}`,
  },

  /* =======================================================
     LOOPS
  ======================================================= */

  {
    slug: 'c-sum-first-n',

    title: 'Sum of First N Numbers',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Calculate the sum from 1 through N.',

    problemStatement:
      'Read a positive integer N and print the sum of integers from 1 to N.',

    inputFormat:
      'One positive integer N.',

    outputFormat:
      'Print the sum.',

    constraints: [
      '1 ≤ N ≤ 100000',
    ],

    skills: [
      'Loops',
      'Accumulation',
    ],

    estimatedMinutes: 10,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    // Calculate the sum

    return 0;
}`,
  },

  {
    slug: 'c-multiplication-table',

    title: 'Multiplication Table',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Print a multiplication table using a loop.',

    problemStatement:
      'Read an integer N and print N multiplied by the numbers 1 through 10.',

    inputFormat:
      'A single integer N.',

    outputFormat:
      'Print ten results, one per line.',

    skills: [
      'for Loop',
      'Arithmetic',
    ],

    estimatedMinutes: 10,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    // Print the table

    return 0;
}`,
  },

  {
    slug: 'c-factorial',

    title: 'Factorial of a Number',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Calculate factorial using iteration.',

    problemStatement:
      'Read a non-negative integer N and calculate N factorial.',

    inputFormat:
      'A non-negative integer N.',

    outputFormat:
      'Print N!.',

    constraints: [
      '0 ≤ N ≤ 20',
    ],

    skills: [
      'Loops',
      'Multiplication',
      'long long',
    ],

    estimatedMinutes: 15,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    // Calculate factorial

    return 0;
}`,

    sampleTests: [
      {
        id: 'sample-1',

        title: 'Factorial',

        input: '5',

        expectedOutput: '120',
      },
    ],
  },

  {
    slug: 'c-prime-number',

    title: 'Check Prime Number',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Determine whether an integer is prime.',

    problemStatement:
      'Read an integer N and print Prime if it has exactly two positive divisors. Otherwise print Not Prime.',

    inputFormat:
      'One integer N.',

    outputFormat:
      'Print Prime or Not Prime.',

    skills: [
      'Loops',
      'Modulo',
      'Optimization',
    ],

    estimatedMinutes: 20,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    // Check whether n is prime

    return 0;
}`,
  },

  /* =======================================================
     FUNCTIONS
  ======================================================= */

  {
    slug: 'c-max-using-function',

    title: 'Maximum Using a Function',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Create and call a function that returns the larger value.',

    problemStatement:
      'Create a function maxValue that receives two integers and returns the larger one.',

    inputFormat:
      'Two integers A and B.',

    outputFormat:
      'Print the larger value.',

    skills: [
      'Functions',
      'Parameters',
      'Return Values',
    ],

    estimatedMinutes: 15,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int maxValue(int a, int b) {
    // Complete the function
    return 0;
}

int main(void) {
    int a;
    int b;

    scanf("%d %d", &a, &b);

    printf("%d", maxValue(a, b));

    return 0;
}`,
  },

  {
    slug: 'c-prime-using-function',

    title: 'Prime Check Using Function',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Move prime-number logic into a reusable function.',

    problemStatement:
      'Create a function isPrime that returns 1 when N is prime and 0 otherwise.',

    skills: [
      'Functions',
      'Loops',
      'Return Values',
    ],

    estimatedMinutes: 20,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int isPrime(int n) {
    // Complete the function
    return 0;
}

int main(void) {
    int n;

    scanf("%d", &n);

    // Use isPrime and print the result

    return 0;
}`,
  },

  {
    slug: 'c-gcd-using-function',

    title: 'GCD Using Function',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Calculate the greatest common divisor with a function.',

    problemStatement:
      'Create a function that returns the greatest common divisor of two positive integers.',

    skills: [
      'Functions',
      'Euclidean Algorithm',
    ],

    estimatedMinutes: 20,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int gcd(int a, int b) {
    // Complete this function
    return 0;
}

int main(void) {
    int a;
    int b;

    scanf("%d %d", &a, &b);

    printf("%d", gcd(a, b));

    return 0;
}`,
  },

  /* =======================================================
     ARRAYS
  ======================================================= */

  {
    slug: 'c-array-sum',

    title: 'Sum of Array Elements',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Calculate the sum of values stored in an array.',

    problemStatement:
      'Read N integers into an array and print the sum of all elements.',

    inputFormat:
      'First line contains N. Second line contains N integers.',

    outputFormat:
      'Print the sum.',

    skills: [
      'Arrays',
      'Loops',
    ],

    estimatedMinutes: 15,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    int values[n];

    // Read values and calculate sum

    return 0;
}`,
  },

  {
    slug: 'c-array-maximum',

    title: 'Maximum Element in Array',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Find the largest element in an integer array.',

    problemStatement:
      'Read N integers and print the maximum value.',

    skills: [
      'Arrays',
      'Comparison',
      'Loops',
    ],

    estimatedMinutes: 15,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    int values[n];

    // Read the values
    // Find the maximum

    return 0;
}`,
  },

  {
    slug: 'c-array-reverse',

    title: 'Reverse an Array',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Print array elements in reverse order.',

    problemStatement:
      'Read N integers and print them from the last element to the first.',

    skills: [
      'Arrays',
      'Reverse Traversal',
    ],

    estimatedMinutes: 20,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    int values[n];

    // Complete the solution

    return 0;
}`,
  },

  {
    slug: 'c-second-largest',

    title: 'Second Largest Element',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Find the second largest distinct value in an array.',

    problemStatement:
      'Read an integer array and print its second largest distinct element.',

    skills: [
      'Arrays',
      'Comparison',
      'Algorithmic Thinking',
    ],

    estimatedMinutes: 25,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    int values[n];

    // Find second largest distinct value

    return 0;
}`,
  },

  /* =======================================================
     SEARCHING / SORTING
  ======================================================= */

  {
    slug: 'c-linear-search',

    title: 'Linear Search',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Find an element by scanning an array sequentially.',

    problemStatement:
      'Read an array and a target value. Print its zero-based index or -1 if it does not exist.',

    skills: [
      'Searching',
      'Arrays',
      'Loops',
    ],

    estimatedMinutes: 15,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    int values[n];

    // Complete linear search

    return 0;
}`,
  },

  {
    slug: 'c-bubble-sort',

    title: 'Bubble Sort',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Sort an integer array using Bubble Sort.',

    problemStatement:
      'Read N integers and sort them in ascending order using the Bubble Sort algorithm.',

    skills: [
      'Sorting',
      'Nested Loops',
      'Arrays',
    ],

    estimatedMinutes: 25,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    int values[n];

    // Implement Bubble Sort

    return 0;
}`,
  },

  {
    slug: 'c-binary-search',

    title: 'Binary Search',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Find a target in a sorted array using binary search.',

    problemStatement:
      'Given a sorted array and target value, print the target index or -1 when it is not found.',

    skills: [
      'Binary Search',
      'Arrays',
      'Algorithms',
    ],

    estimatedMinutes: 25,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    int values[n];

    // Implement Binary Search

    return 0;
}`,
  },

  /* =======================================================
     STRINGS
  ======================================================= */

  {
    slug: 'c-string-length',

    title: 'String Length Without strlen',

    technologySlug: 'c',

    difficulty: 'Easy',

    workspaceType: 'code',

    shortDescription:
      'Calculate string length without using strlen.',

    problemStatement:
      'Read a string and calculate its length manually by iterating until the null terminator.',

    skills: [
      'Strings',
      'Character Arrays',
      'Loops',
    ],

    estimatedMinutes: 15,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    char text[1000];

    scanf("%999s", text);

    // Calculate length manually

    return 0;
}`,
  },

  {
    slug: 'c-string-reverse',

    title: 'Reverse a String',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Reverse the characters of a string.',

    problemStatement:
      'Read a string and print its characters in reverse order.',

    skills: [
      'Strings',
      'Arrays',
      'Reverse Traversal',
    ],

    estimatedMinutes: 20,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    char text[1000];

    scanf("%999s", text);

    // Reverse the string

    return 0;
}`,
  },

  {
    slug: 'c-palindrome-string',

    title: 'Palindrome String',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Check whether a string reads the same forwards and backwards.',

    problemStatement:
      'Read a string. Print Palindrome if it reads identically forwards and backwards, otherwise print Not Palindrome.',

    skills: [
      'Strings',
      'Two-Pointer Logic',
    ],

    estimatedMinutes: 20,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    char text[1000];

    scanf("%999s", text);

    // Check palindrome

    return 0;
}`,
  },

  /* =======================================================
     POINTERS
  ======================================================= */

  {
    slug: 'c-swap-pointers',

    title: 'Swap Using Pointers',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Swap two values by passing their addresses to a function.',

    problemStatement:
      'Create a swap function that receives two integer pointers and exchanges their values.',

    skills: [
      'Pointers',
      'Functions',
      'Addresses',
    ],

    estimatedMinutes: 20,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

void swap(int *a, int *b) {
    // Swap values
}

int main(void) {
    int a;
    int b;

    scanf("%d %d", &a, &b);

    swap(&a, &b);

    printf("%d %d", a, b);

    return 0;
}`,
  },

  {
    slug: 'c-array-using-pointer',

    title: 'Access Array Using Pointer',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Traverse an array with pointer arithmetic.',

    problemStatement:
      'Read N integers and print them using pointer arithmetic rather than array indexing.',

    skills: [
      'Pointers',
      'Pointer Arithmetic',
      'Arrays',
    ],

    estimatedMinutes: 25,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    int values[n];

    // Read and print using pointers

    return 0;
}`,
  },

  /* =======================================================
     ADVANCED
  ======================================================= */

  {
    slug: 'c-missing-number',

    title: 'Find the Missing Number',

    technologySlug: 'c',

    difficulty: 'Medium',

    workspaceType: 'code',

    shortDescription:
      'Find a missing integer from a consecutive sequence.',

    problemStatement:
      'An array contains N-1 distinct integers from 1 through N. Find the missing number.',

    skills: [
      'Arrays',
      'Mathematics',
      'Algorithms',
    ],

    estimatedMinutes: 25,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    // Find the missing number

    return 0;
}`,
  },

  {
    slug: 'c-maximum-subarray',

    title: 'Maximum Subarray Sum',

    technologySlug: 'c',

    difficulty: 'Hard',

    workspaceType: 'code',

    shortDescription:
      'Find the contiguous subarray with the maximum possible sum.',

    problemStatement:
      'Given an integer array, determine the maximum sum of any contiguous subarray.',

    skills: [
      'Arrays',
      'Dynamic Thinking',
      'Kadane Algorithm',
    ],

    estimatedMinutes: 35,

    defaultLanguage: 'c',

    allowedLanguages: [
      'c',
    ],

    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    int values[n];

    // Find maximum contiguous sum

    return 0;
}`,
  },
];