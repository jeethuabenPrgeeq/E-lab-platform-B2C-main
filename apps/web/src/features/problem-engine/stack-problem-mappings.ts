import {
  getProblemsBySlugs,
} from './problems';

/* =========================================================
   STACK MODULE → PROBLEM MAPPING
========================================================= */

/*
 * Format:
 *
 * stackSlug:moduleSlug
 *
 * Example:
 *
 * mern:react
 * mean:angular
 * django:python
 */

const stackProblemMappings:
  Record<
    string,
    string[]
  > = {
  /* =======================================================
     MERN
  ======================================================= */

  'mern:html': [
    'html-profile-page',
    'html-registration-form',
    'html-semantic-blog',
  ],

  'mern:css': [
    'css-responsive-card',
    'css-flexbox-navbar',
    'css-grid-dashboard',
  ],

  'mern:javascript': [
    'javascript-cart-total',
    'javascript-filter-products',
    'javascript-user-fetch',
  ],

  'mern:react': [
    'react-counter',
    'react-search-products',
    'react-todo',
    'react-user-directory',
  ],

  /* =======================================================
     MEAN
  ======================================================= */

  'mean:html': [
    'html-profile-page',
    'html-registration-form',
    'html-semantic-blog',
  ],

  'mean:css': [
    'css-responsive-card',
    'css-flexbox-navbar',
    'css-grid-dashboard',
  ],

  'mean:javascript': [
    'javascript-cart-total',
    'javascript-filter-products',
    'javascript-user-fetch',
  ],

  /*
   * Angular problems will be added
   * later.
   */

  /* =======================================================
     NEXT + NEST
  ======================================================= */

  'next-nest:html': [
    'html-profile-page',
    'html-registration-form',
  ],

  'next-nest:css': [
    'css-responsive-card',
    'css-grid-dashboard',
  ],

  'next-nest:javascript': [
    'javascript-cart-total',
    'javascript-filter-products',
  ],

  'next-nest:react': [
    'react-counter',
    'react-search-products',
    'react-todo',
    'react-user-directory',
  ],

  /* =======================================================
     DJANGO
  ======================================================= */

  'django:html': [
    'html-profile-page',
    'html-registration-form',
    'html-semantic-blog',
  ],

  'django:css': [
    'css-responsive-card',
    'css-flexbox-navbar',
    'css-grid-dashboard',
  ],

  'django:javascript': [
    'javascript-cart-total',
    'javascript-filter-products',
  ],
};

/* =========================================================
   GET STACK MODULE PROBLEMS
========================================================= */

export function getProblemsForStackModule(
  stackSlug: string,
  moduleSlug: string,
) {
  const key =
    `${stackSlug}:${moduleSlug}`;

  const problemSlugs =
    stackProblemMappings[
      key
    ] ?? [];

  return getProblemsBySlugs(
    problemSlugs,
  );
}