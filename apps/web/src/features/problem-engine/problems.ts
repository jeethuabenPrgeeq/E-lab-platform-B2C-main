import type {
  PracticeProblem,
} from './types';

import {
  cProblems,
} from './c-problems';

import {
  cppProblems,
} from './cpp-problems';

import {
  javaProblems,
} from './java-problems';

import {
  csharpProblems,
} from './csharp-problems';

import {
  pythonProblems,
} from './python-problems';

import {
  goProblems,
} from './go-problems';

import {
  rubyProblems,
} from './ruby-problems';

import {
  swiftProblems,
} from './swift-problems';

import {
  gitProblems,
} from './git-problems';

/* =========================================================
   ALL PROBLEMS
========================================================= */

export const problems:
  PracticeProblem[] = [
  ...cProblems,
  ...cppProblems,
  ...javaProblems,
  ...csharpProblems,
  ...pythonProblems,
  ...goProblems,
  ...rubyProblems,
  ...swiftProblems,
  ...gitProblems,
];

/* =========================================================
   GET PROBLEM BY SLUG
========================================================= */

export function getProblemBySlug(
  slug: string,
) {
  return problems.find(
    (problem) =>
      problem.slug === slug,
  );
}

/* =========================================================
   GET PROBLEMS BY TECHNOLOGY
========================================================= */

export function getProblemsByTechnology(
  technologySlug: string,
) {
  return problems.filter(
    (problem) =>
      problem.technologySlug ===
      technologySlug,
  );
}

/* =========================================================
   GET PROBLEMS BY SLUGS
========================================================= */

export function getProblemsBySlugs(
  slugs: string[],
) {
  return slugs
    .map(
      (slug) =>
        getProblemBySlug(
          slug,
        ),
    )
    .filter(
      (
        problem,
      ): problem is PracticeProblem =>
        Boolean(
          problem,
        ),
    );
}