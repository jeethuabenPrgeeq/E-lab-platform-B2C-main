import type {
  PracticeProblem,
} from './types';

/* =========================================================
   HELPER
========================================================= */

type CppProblemInput =
  Omit<
    PracticeProblem,
    | 'technologySlug'
    | 'workspaceType'
    | 'defaultLanguage'
    | 'allowedLanguages'
  >;

function cppProblem(
  problem: CppProblemInput,
): PracticeProblem {
  return {
    ...problem,

    technologySlug:
      'cpp',

    workspaceType:
      'code',

    defaultLanguage:
      'cpp',

    allowedLanguages: [
      'cpp',
    ],
  };
}

/* =========================================================
   C++ PROBLEMS
========================================================= */

export const cppProblems:
  PracticeProblem[] = [
  /* =======================================================
     01 — FUNDAMENTALS
  ======================================================= */

  cppProblem({
    slug:
      'cpp-hello-world',

    title:
      'Hello World',

    difficulty:
      'Easy',

    shortDescription:
      'Print Hello, World! using C++.',

    problemStatement:
      'Write a C++ program that prints Hello, World!',

    outputFormat:
      'Print exactly: Hello, World!',

    skills: [
      'iostream',
      'cout',
      'main',
    ],

    estimatedMinutes:
      5,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    // Write your code here

    return 0;
}
`,

    sampleTests: [
      {
        id: 'sample-1',
        title:
          'Expected Output',
        expectedOutput:
          'Hello, World!',
      },
    ],
  }),

  cppProblem({
    slug:
      'cpp-add-two-numbers',

    title:
      'Add Two Numbers',

    difficulty:
      'Easy',

    shortDescription:
      'Read two integers and print their sum.',

    problemStatement:
      'Write a C++ program that reads two integers and prints their sum.',

    inputFormat:
      'Two integers separated by a space.',

    outputFormat:
      'Print the sum of the two integers.',

    skills: [
      'cin',
      'cout',
      'variables',
      'arithmetic',
    ],

    estimatedMinutes:
      10,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    int a, b;

    cin >> a >> b;

    // Write your code here

    return 0;
}
`,

    sampleTests: [
      {
        id: 'sample-1',
        title:
          'Sample 1',
        input:
          '5 7',
        expectedOutput:
          '12',
      },
    ],
  }),

  cppProblem({
    slug:
      'cpp-basic-arithmetic',

    title:
      'Basic Arithmetic',

    difficulty:
      'Easy',

    shortDescription:
      'Perform basic arithmetic operations on two numbers.',

    problemStatement:
      'Read two integers and print their sum, difference, product, and quotient.',

    inputFormat:
      'Two integers a and b.',

    outputFormat:
      'Print the arithmetic results.',

    skills: [
      'operators',
      'variables',
      'cin',
      'cout',
    ],

    estimatedMinutes:
      10,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    int a, b;

    cin >> a >> b;

    // Perform arithmetic operations

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-celsius-fahrenheit',

    title:
      'Celsius to Fahrenheit',

    difficulty:
      'Easy',

    shortDescription:
      'Convert Celsius temperature to Fahrenheit.',

    problemStatement:
      'Read a Celsius temperature and convert it to Fahrenheit.',

    inputFormat:
      'A Celsius temperature.',

    outputFormat:
      'Print the Fahrenheit temperature.',

    skills: [
      'formula',
      'floating-point',
      'arithmetic',
    ],

    estimatedMinutes:
      10,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    double celsius;

    cin >> celsius;

    // Convert to Fahrenheit

    return 0;
}
`,
  }),

  /* =======================================================
     02 — CONDITIONS
  ======================================================= */

  cppProblem({
    slug:
      'cpp-even-odd',

    title:
      'Even or Odd',

    difficulty:
      'Easy',

    shortDescription:
      'Determine whether a number is even or odd.',

    problemStatement:
      'Read an integer and print Even if it is divisible by 2; otherwise print Odd.',

    inputFormat:
      'One integer.',

    outputFormat:
      'Print Even or Odd.',

    skills: [
      'if',
      'modulus',
      'conditions',
    ],

    estimatedMinutes:
      10,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    int number;

    cin >> number;

    // Check even or odd

    return 0;
}
`,

    sampleTests: [
      {
        id: 'sample-1',
        title: 'Sample 1',
        input: '8',
        expectedOutput:
          'Even',
      },
      {
        id: 'sample-2',
        title: 'Sample 2',
        input: '5',
        expectedOutput:
          'Odd',
      },
    ],
  }),

  cppProblem({
    slug:
      'cpp-positive-negative-zero',

    title:
      'Positive, Negative or Zero',

    difficulty:
      'Easy',

    shortDescription:
      'Classify an integer by its sign.',

    problemStatement:
      'Read an integer and determine whether it is positive, negative, or zero.',

    skills: [
      'conditions',
      'comparison',
    ],

    estimatedMinutes:
      10,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    int number;

    cin >> number;

    // Determine sign

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-largest-two',

    title:
      'Largest of Two Numbers',

    difficulty:
      'Easy',

    shortDescription:
      'Find the larger of two numbers.',

    problemStatement:
      'Read two integers and print the larger value.',

    skills: [
      'conditions',
      'comparison',
    ],

    estimatedMinutes:
      10,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    int a, b;

    cin >> a >> b;

    // Find largest

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-largest-three',

    title:
      'Largest of Three Numbers',

    difficulty:
      'Easy',

    shortDescription:
      'Find the largest among three integers.',

    problemStatement:
      'Read three integers and print the largest value.',

    skills: [
      'conditions',
      'comparison',
    ],

    estimatedMinutes:
      12,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    int a, b, c;

    cin >> a >> b >> c;

    // Find largest

    return 0;
}
`,
  }),

  /* =======================================================
     03 — LOOPS
  ======================================================= */

  cppProblem({
    slug:
      'cpp-sum-first-n',

    title:
      'Sum of First N Numbers',

    difficulty:
      'Easy',

    shortDescription:
      'Calculate the sum from 1 to N.',

    problemStatement:
      'Read N and print the sum of integers from 1 through N.',

    skills: [
      'loops',
      'accumulator',
    ],

    estimatedMinutes:
      10,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    int n;

    cin >> n;

    // Calculate sum

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-multiplication-table',

    title:
      'Multiplication Table',

    difficulty:
      'Easy',

    shortDescription:
      'Print a multiplication table.',

    problemStatement:
      'Read an integer and print its multiplication table.',

    skills: [
      'loops',
      'multiplication',
    ],

    estimatedMinutes:
      10,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    int number;

    cin >> number;

    // Print multiplication table

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-factorial',

    title:
      'Factorial',

    difficulty:
      'Easy',

    shortDescription:
      'Calculate the factorial of a number.',

    problemStatement:
      'Read a non-negative integer N and print N factorial.',

    skills: [
      'loops',
      'factorial',
    ],

    estimatedMinutes:
      12,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    int n;

    cin >> n;

    // Calculate factorial

    return 0;
}
`,

    sampleTests: [
      {
        id: 'sample-1',
        title:
          'Sample 1',
        input:
          '5',
        expectedOutput:
          '120',
      },
    ],
  }),

  cppProblem({
    slug:
      'cpp-prime-number',

    title:
      'Prime Number',

    difficulty:
      'Easy',

    shortDescription:
      'Determine whether a number is prime.',

    problemStatement:
      'Read an integer and print Prime if it is prime; otherwise print Not Prime.',

    skills: [
      'loops',
      'conditions',
      'prime numbers',
    ],

    estimatedMinutes:
      15,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    int n;

    cin >> n;

    // Check prime

    return 0;
}
`,
  }),

  /* =======================================================
     04 — FUNCTIONS
  ======================================================= */

  cppProblem({
    slug:
      'cpp-max-using-function',

    title:
      'Maximum Using Function',

    difficulty:
      'Medium',

    shortDescription:
      'Find a maximum value using a function.',

    problemStatement:
      'Create a function that returns the larger of two integers.',

    skills: [
      'functions',
      'return values',
    ],

    estimatedMinutes:
      15,

    starterCode: `#include <iostream>
using namespace std;

int findMax(int a, int b) {
    // Write function logic
    return 0;
}

int main() {
    int a, b;

    cin >> a >> b;

    cout << findMax(a, b) << '\\n';

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-prime-using-function',

    title:
      'Prime Using Function',

    difficulty:
      'Medium',

    shortDescription:
      'Check prime numbers using a function.',

    problemStatement:
      'Create a function that determines whether an integer is prime.',

    skills: [
      'functions',
      'prime numbers',
      'bool',
    ],

    estimatedMinutes:
      15,

    starterCode: `#include <iostream>
using namespace std;

bool isPrime(int n) {
    // Write function logic
    return false;
}

int main() {
    int n;

    cin >> n;

    cout << (isPrime(n) ? "Prime" : "Not Prime") << '\\n';

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-gcd-using-function',

    title:
      'GCD Using Function',

    difficulty:
      'Medium',

    shortDescription:
      'Calculate GCD using a function.',

    problemStatement:
      'Write a function that calculates the greatest common divisor of two integers.',

    skills: [
      'functions',
      'Euclidean algorithm',
    ],

    estimatedMinutes:
      15,

    starterCode: `#include <iostream>
using namespace std;

int gcd(int a, int b) {
    // Write function logic
    return 0;
}

int main() {
    int a, b;

    cin >> a >> b;

    cout << gcd(a, b) << '\\n';

    return 0;
}
`,
  }),

  /* =======================================================
     05 — ARRAYS
  ======================================================= */

  cppProblem({
    slug:
      'cpp-array-sum',

    title:
      'Array Sum',

    difficulty:
      'Medium',

    shortDescription:
      'Calculate the sum of array elements.',

    problemStatement:
      'Read N integers into an array and print their sum.',

    skills: [
      'arrays',
      'loops',
    ],

    estimatedMinutes:
      15,

    starterCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;

    cin >> n;

    vector<int> values(n);

    // Read values and calculate sum

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-array-maximum',

    title:
      'Maximum in Array',

    difficulty:
      'Medium',

    shortDescription:
      'Find the largest value in an array.',

    problemStatement:
      'Read an array and print its maximum element.',

    skills: [
      'arrays',
      'loops',
      'comparison',
    ],

    estimatedMinutes:
      15,

    starterCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;

    cin >> n;

    vector<int> values(n);

    // Find maximum

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-array-reverse',

    title:
      'Reverse an Array',

    difficulty:
      'Medium',

    shortDescription:
      'Print an array in reverse order.',

    problemStatement:
      'Read N integers and print them in reverse order.',

    skills: [
      'arrays',
      'loops',
    ],

    estimatedMinutes:
      15,

    starterCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;

    cin >> n;

    vector<int> values(n);

    // Reverse array

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-second-largest',

    title:
      'Second Largest Element',

    difficulty:
      'Medium',

    shortDescription:
      'Find the second largest array element.',

    problemStatement:
      'Read an array and print its second largest distinct element.',

    skills: [
      'arrays',
      'comparison',
    ],

    estimatedMinutes:
      20,

    starterCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;

    cin >> n;

    vector<int> values(n);

    // Find second largest

    return 0;
}
`,
  }),

  /* =======================================================
     06 — SEARCHING & SORTING
  ======================================================= */

  cppProblem({
    slug:
      'cpp-linear-search',

    title:
      'Linear Search',

    difficulty:
      'Medium',

    shortDescription:
      'Search an array sequentially.',

    problemStatement:
      'Search for a target value using linear search.',

    skills: [
      'searching',
      'arrays',
      'loops',
    ],

    estimatedMinutes:
      15,

    starterCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;

    cin >> n;

    vector<int> values(n);

    // Perform linear search

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-bubble-sort',

    title:
      'Bubble Sort',

    difficulty:
      'Medium',

    shortDescription:
      'Sort an array using bubble sort.',

    problemStatement:
      'Read an array and sort it in ascending order using bubble sort.',

    skills: [
      'sorting',
      'nested loops',
      'arrays',
    ],

    estimatedMinutes:
      20,

    starterCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;

    cin >> n;

    vector<int> values(n);

    // Bubble sort

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-binary-search',

    title:
      'Binary Search',

    difficulty:
      'Medium',

    shortDescription:
      'Search a sorted array efficiently.',

    problemStatement:
      'Use binary search to locate a target in a sorted array.',

    skills: [
      'binary search',
      'arrays',
      'algorithms',
    ],

    estimatedMinutes:
      20,

    starterCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;

    cin >> n;

    vector<int> values(n);

    // Perform binary search

    return 0;
}
`,
  }),

  /* =======================================================
     07 — STRINGS
  ======================================================= */

  cppProblem({
    slug:
      'cpp-string-length',

    title:
      'String Length',

    difficulty:
      'Medium',

    shortDescription:
      'Find the length of a string.',

    problemStatement:
      'Read a string and print its length.',

    skills: [
      'string',
      'length',
    ],

    estimatedMinutes:
      10,

    starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string text;

    getline(cin, text);

    // Find string length

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-string-reverse',

    title:
      'Reverse a String',

    difficulty:
      'Medium',

    shortDescription:
      'Reverse the characters of a string.',

    problemStatement:
      'Read a string and print it in reverse order.',

    skills: [
      'string',
      'loops',
    ],

    estimatedMinutes:
      15,

    starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string text;

    getline(cin, text);

    // Reverse string

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-palindrome-string',

    title:
      'Palindrome String',

    difficulty:
      'Medium',

    shortDescription:
      'Determine whether a string is a palindrome.',

    problemStatement:
      'Read a string and determine whether it reads the same forward and backward.',

    skills: [
      'string',
      'palindrome',
      'two pointers',
    ],

    estimatedMinutes:
      15,

    starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string text;

    getline(cin, text);

    // Check palindrome

    return 0;
}
`,
  }),

  /* =======================================================
     08 — POINTERS / REFERENCES
  ======================================================= */

  cppProblem({
    slug:
      'cpp-swap-pointers',

    title:
      'Swap Using Pointers',

    difficulty:
      'Hard',

    shortDescription:
      'Swap two values using pointers.',

    problemStatement:
      'Read two integers and swap their values using pointers.',

    skills: [
      'pointers',
      'functions',
      'memory',
    ],

    estimatedMinutes:
      20,

    starterCode: `#include <iostream>
using namespace std;

void swapValues(int* a, int* b) {
    // Swap values
}

int main() {
    int a, b;

    cin >> a >> b;

    swapValues(&a, &b);

    // Print results

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-array-using-pointer',

    title:
      'Array Using Pointer',

    difficulty:
      'Hard',

    shortDescription:
      'Access array elements using pointers.',

    problemStatement:
      'Read array values and process them through pointer arithmetic.',

    skills: [
      'pointers',
      'arrays',
      'pointer arithmetic',
    ],

    estimatedMinutes:
      20,

    starterCode: `#include <iostream>
using namespace std;

int main() {
    int values[100];
    int n;

    cin >> n;

    // Use pointers to process array

    return 0;
}
`,
  }),

  /* =======================================================
     09 — ADVANCED PROBLEM SOLVING
  ======================================================= */

  cppProblem({
    slug:
      'cpp-missing-number',

    title:
      'Find Missing Number',

    difficulty:
      'Hard',

    shortDescription:
      'Find a missing number in a sequence.',

    problemStatement:
      'Given numbers from 1 to N with one missing value, find the missing number.',

    skills: [
      'arrays',
      'mathematics',
      'algorithms',
    ],

    estimatedMinutes:
      25,

    starterCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;

    cin >> n;

    vector<int> values(n - 1);

    // Find missing number

    return 0;
}
`,
  }),

  cppProblem({
    slug:
      'cpp-maximum-subarray',

    title:
      'Maximum Subarray',

    difficulty:
      'Hard',

    shortDescription:
      'Find the maximum sum of a contiguous subarray.',

    problemStatement:
      'Find the maximum possible sum of a contiguous subarray.',

    skills: [
      'arrays',
      'Kadane algorithm',
      'dynamic programming',
    ],

    estimatedMinutes:
      30,

    starterCode: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;

    cin >> n;

    vector<int> values(n);

    // Find maximum subarray sum

    return 0;
}
`,
  }),
];