export type JudgeTestCase = {
  id: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
};

const cTestCases: Record<string, JudgeTestCase[]> = {
  /* =======================================================
     ADD TWO NUMBERS
  ======================================================= */

  'c-add-two-numbers': [
    {
      id: 'hidden-1',
      input: '5 7',
      expectedOutput: '12',
      hidden: true,
    },
    {
      id: 'hidden-2',
      input: '10 20',
      expectedOutput: '30',
      hidden: true,
    },
    {
      id: 'hidden-3',
      input: '-10 5',
      expectedOutput: '-5',
      hidden: true,
    },
    {
      id: 'hidden-4',
      input: '0 0',
      expectedOutput: '0',
      hidden: true,
    },
    {
      id: 'hidden-5',
      input: '100000 100000',
      expectedOutput: '200000',
      hidden: true,
    },
  ],

  /* =======================================================
     EVEN OR ODD
  ======================================================= */

  'c-even-odd': [
    {
      id: 'hidden-1',
      input: '8',
      expectedOutput: 'Even',
      hidden: true,
    },
    {
      id: 'hidden-2',
      input: '7',
      expectedOutput: 'Odd',
      hidden: true,
    },
    {
      id: 'hidden-3',
      input: '0',
      expectedOutput: 'Even',
      hidden: true,
    },
    {
      id: 'hidden-4',
      input: '-11',
      expectedOutput: 'Odd',
      hidden: true,
    },
    {
      id: 'hidden-5',
      input: '-24',
      expectedOutput: 'Even',
      hidden: true,
    },
  ],

  /* =======================================================
     FACTORIAL
  ======================================================= */

  'c-factorial': [
    {
      id: 'hidden-1',
      input: '0',
      expectedOutput: '1',
      hidden: true,
    },
    {
      id: 'hidden-2',
      input: '1',
      expectedOutput: '1',
      hidden: true,
    },
    {
      id: 'hidden-3',
      input: '5',
      expectedOutput: '120',
      hidden: true,
    },
    {
      id: 'hidden-4',
      input: '10',
      expectedOutput: '3628800',
      hidden: true,
    },
    {
      id: 'hidden-5',
      input: '12',
      expectedOutput: '479001600',
      hidden: true,
    },
  ],

  /* =======================================================
     PRIME NUMBER
  ======================================================= */

  'c-prime-number': [
    {
      id: 'hidden-1',
      input: '2',
      expectedOutput: 'Prime',
      hidden: true,
    },
    {
      id: 'hidden-2',
      input: '17',
      expectedOutput: 'Prime',
      hidden: true,
    },
    {
      id: 'hidden-3',
      input: '1',
      expectedOutput: 'Not Prime',
      hidden: true,
    },
    {
      id: 'hidden-4',
      input: '25',
      expectedOutput: 'Not Prime',
      hidden: true,
    },
    {
      id: 'hidden-5',
      input: '-5',
      expectedOutput: 'Not Prime',
      hidden: true,
    },
  ],
};

/* =========================================================
   GET TEST CASES
========================================================= */

export function getCTestCases(
  problemSlug: string,
): JudgeTestCase[] {
  return cTestCases[problemSlug] ?? [];
}