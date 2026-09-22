/* =========================================================
   LOCAL PRACTICE PROGRESS

   TEMPORARY STORAGE LAYER

   This file stores solved problems in localStorage.

   Later, this can be replaced by:
   NestJS API
      ↓
   PostgreSQL
      ↓
   UserProblemProgress
========================================================= */

/* =========================================================
   STATUS TYPE
========================================================= */

export type LocalProblemStatus =
  | 'not-started'
  | 'solved';

/* =========================================================
   STORAGE CONSTANTS
========================================================= */

const STORAGE_PREFIX =
  'elab_solved_problems';

const USER_STORAGE_KEY =
  'elab_dummy_user';

/* =========================================================
   CHECK BROWSER
========================================================= */

function canUseLocalStorage() {
  return (
    typeof window !==
      'undefined' &&
    typeof window.localStorage !==
      'undefined'
  );
}

/* =========================================================
   CURRENT USER
========================================================= */

function getCurrentUserKey() {
  if (
    !canUseLocalStorage()
  ) {
    return 'guest';
  }

  const user =
    localStorage.getItem(
      USER_STORAGE_KEY,
    );

  /*
   * Avoid empty user values.
   */

  if (
    !user ||
    !user.trim()
  ) {
    return 'guest';
  }

  return user.trim();
}

/* =========================================================
   STORAGE KEY

   Example:

   learner@elab.com

   becomes:

   elab_solved_problems_learner@elab.com
========================================================= */

function getStorageKey() {
  const user =
    getCurrentUserKey();

  return `${STORAGE_PREFIX}_${user}`;
}

/* =========================================================
   VALIDATE STORED DATA
========================================================= */

function sanitizeProblemSlugs(
  value: unknown,
): string[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  /*
   * Keep only valid,
   * non-empty strings.
   */

  const validSlugs =
    value.filter(
      (
        item,
      ): item is string =>
        typeof item ===
          'string' &&
        item.trim().length >
          0,
    );

  /*
   * Remove duplicates.
   */

  return Array.from(
    new Set(
      validSlugs,
    ),
  );
}

/* =========================================================
   GET ALL SOLVED PROBLEMS
========================================================= */

export function getSolvedProblemSlugs(): string[] {
  if (
    !canUseLocalStorage()
  ) {
    return [];
  }

  try {
    const raw =
      localStorage.getItem(
        getStorageKey(),
      );

    if (!raw) {
      return [];
    }

    const parsed:
      unknown =
      JSON.parse(
        raw,
      );

    return sanitizeProblemSlugs(
      parsed,
    );
  } catch (
    error
  ) {
    console.error(
      'Unable to read local practice progress:',
      error,
    );

    return [];
  }
}

/* =========================================================
   CHECK WHETHER A PROBLEM IS SOLVED
========================================================= */

export function isProblemSolved(
  problemSlug: string,
): boolean {
  if (
    !problemSlug ||
    !problemSlug.trim()
  ) {
    return false;
  }

  const solvedProblems =
    getSolvedProblemSlugs();

  return solvedProblems.includes(
    problemSlug,
  );
}

/* =========================================================
   GET PROBLEM STATUS

   Useful for ProblemCard.tsx
========================================================= */

export function getProblemStatus(
  problemSlug: string,
): LocalProblemStatus {
  return isProblemSolved(
    problemSlug,
  )
    ? 'solved'
    : 'not-started';
}

/* =========================================================
   MARK PROBLEM AS SOLVED
========================================================= */

export function markProblemSolved(
  problemSlug: string,
): void {
  if (
    !canUseLocalStorage()
  ) {
    return;
  }

  const cleanProblemSlug =
    problemSlug.trim();

  if (
    !cleanProblemSlug
  ) {
    return;
  }

  try {
    const solvedProblems =
      getSolvedProblemSlugs();

    /*
     * Already solved.
     *
     * Do not create duplicates.
     */

    if (
      solvedProblems.includes(
        cleanProblemSlug,
      )
    ) {
      return;
    }

    const updatedProblems = [
      ...solvedProblems,
      cleanProblemSlug,
    ];

    localStorage.setItem(
      getStorageKey(),
      JSON.stringify(
        updatedProblems,
      ),
    );
  } catch (
    error
  ) {
    console.error(
      'Unable to save local practice progress:',
      error,
    );
  }
}

/* =========================================================
   GET NUMBER OF SOLVED PROBLEMS

   Optional convenience function.
========================================================= */

export function getSolvedProblemCount(): number {
  return getSolvedProblemSlugs()
    .length;
}

/* =========================================================
   COUNT SOLVED PROBLEMS FOR A SPECIFIC PRACTICE PATH

   Example:

   [
     'c-hello-world',
     'c-add-two-numbers',
     'c-even-odd'
   ]

   If 2 are solved → returns 2.
========================================================= */

export function getSolvedCountForProblems(
  problemSlugs: string[],
): number {
  if (
    problemSlugs.length ===
    0
  ) {
    return 0;
  }

  const solvedProblems =
    new Set(
      getSolvedProblemSlugs(),
    );

  return problemSlugs.filter(
    (
      problemSlug,
    ) =>
      solvedProblems.has(
        problemSlug,
      ),
  ).length;
}

/* =========================================================
   CLEAR ONE PROBLEM

   Useful during development/testing.

   Later it may also support
   administrator reset or learner reset.
========================================================= */

export function clearProblemSolvedStatus(
  problemSlug: string,
): void {
  if (
    !canUseLocalStorage()
  ) {
    return;
  }

  const cleanProblemSlug =
    problemSlug.trim();

  if (
    !cleanProblemSlug
  ) {
    return;
  }

  try {
    const solvedProblems =
      getSolvedProblemSlugs();

    const updatedProblems =
      solvedProblems.filter(
        (
          slug,
        ) =>
          slug !==
          cleanProblemSlug,
      );

    localStorage.setItem(
      getStorageKey(),
      JSON.stringify(
        updatedProblems,
      ),
    );
  } catch (
    error
  ) {
    console.error(
      'Unable to update local practice progress:',
      error,
    );
  }
}

/* =========================================================
   CLEAR ALL SOLVED PROBLEMS FOR CURRENT USER

   Mainly useful during development/testing.
========================================================= */

export function clearAllSolvedProblems(): void {
  if (
    !canUseLocalStorage()
  ) {
    return;
  }

  try {
    localStorage.removeItem(
      getStorageKey(),
    );
  } catch (
    error
  ) {
    console.error(
      'Unable to clear local practice progress:',
      error,
    );
  }
}