/* =========================================================
   RUBY HIDDEN TEST CASES
========================================================= */

export type RubyTestCase = {
  input: string;

  expectedOutput: string;
};

/* =========================================================
   TEST CASE DATABASE

   Temporary in-code tests.

   Later these will move to PostgreSQL.
========================================================= */

const rubyTestCases:
  Record<string, RubyTestCase[]> = {
  /* =======================================================
     HELLO WORLD
  ======================================================= */

  'ruby-hello-world': [
    {
      input: '',
      expectedOutput:
        'Hello, World!',
    },
  ],

  /* =======================================================
     ADD TWO NUMBERS
  ======================================================= */

  'ruby-add-two-numbers': [
    { input: '5 7', expectedOutput: '12' },
    { input: '10 20', expectedOutput: '30' },
    { input: '-5 8', expectedOutput: '3' },
    { input: '-10 -20', expectedOutput: '-30' },
    { input: '0 0', expectedOutput: '0' },
  ],

  /* =======================================================
     EVEN OR ODD
  ======================================================= */

  'ruby-even-odd': [
    { input: '8', expectedOutput: 'Even' },
    { input: '5', expectedOutput: 'Odd' },
    { input: '0', expectedOutput: 'Even' },
    { input: '-4', expectedOutput: 'Even' },
    { input: '-7', expectedOutput: 'Odd' },
  ],

  /* =======================================================
     FACTORIAL
  ======================================================= */

  'ruby-factorial': [
    { input: '0', expectedOutput: '1' },
    { input: '1', expectedOutput: '1' },
    { input: '5', expectedOutput: '120' },
    { input: '6', expectedOutput: '720' },
    { input: '10', expectedOutput: '3628800' },
  ],

  /* =======================================================
     PRIME NUMBER
  ======================================================= */

  'ruby-prime-number': [
    { input: '2', expectedOutput: 'Prime' },
    { input: '7', expectedOutput: 'Prime' },
    { input: '11', expectedOutput: 'Prime' },
    { input: '4', expectedOutput: 'Not Prime' },
    { input: '1', expectedOutput: 'Not Prime' },
  ],
};

/* =========================================================
   GET RUBY TEST CASES
========================================================= */

export function getRubyTestCases(
  problemSlug: string,
): RubyTestCase[] {
  return (
    rubyTestCases[
      problemSlug
    ] ?? []
  );
}