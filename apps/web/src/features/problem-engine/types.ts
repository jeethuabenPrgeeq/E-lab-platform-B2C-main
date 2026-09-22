/* =========================================================
   PROBLEM ENGINE TYPES
========================================================= */

/*
 * Problem difficulty is different
 * from practice-path level.
 *
 * ProblemDifficulty:
 * Easy / Medium / Hard
 *
 * PracticeLevel:
 * Beginner / Intermediate / Advanced
 */

export type ProblemDifficulty =
  | 'Easy'
  | 'Medium'
  | 'Hard';

/* =========================================================
   WORKSPACE TYPE
========================================================= */

export type WorkspaceType =
  | 'code'
  | 'web'
  | 'framework'
  | 'database'
  | 'devops';

/* =========================================================
   PROBLEM SOURCE
========================================================= */

export type ProblemSource =
  | 'practice'
  | 'stack'
  | 'challenge';

/* =========================================================
   SUPPORTED LANGUAGE SLUG

   Keep this extensible as more
   compiler runtimes are added.
========================================================= */

export type ProblemLanguage =
  | 'c'
  | 'cpp'
  | 'java'
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'csharp'
  | 'go'
  | 'ruby'
  | 'git'
  | 'swift'
  | 'html'
  | 'css'
  | 'sql';

/* =========================================================
   STARTER FILE
========================================================= */

export type StarterFile = {
  /*
   * File path inside workspace.
   *
   * Examples:
   *
   * main.c
   * main.cpp
   * index.html
   * src/App.tsx
   */

  path: string;

  /*
   * Language used by the file.
   */

  language: string;

  /*
   * Initial learner content.
   */

  content: string;
};

/* =========================================================
   SAMPLE TEST CASE
========================================================= */

export type SampleTestCase = {
  /*
   * Unique test identifier.
   */

  id: string;

  /*
   * Visible title.
   *
   * Example:
   * Sample 1
   */

  title: string;

  /*
   * Optional stdin.
   */

  input?: string;

  /*
   * Expected visible output.
   */

  expectedOutput?: string;

  /*
   * Optional learner-facing
   * explanation.
   */

  description?: string;
};

/* =========================================================
   PRACTICE PROBLEM
========================================================= */

export type PracticeProblem = {
  /*
   * Globally unique problem slug.
   *
   * Examples:
   *
   * c-hello-world
   * cpp-hello-world
   */

  slug: string;

  /*
   * Problem display title.
   */

  title: string;

  /*
   * Technology owning this problem.
   *
   * Examples:
   *
   * c
   * cpp
   * python
   * javascript
   */

  technologySlug: string;

  /*
   * Individual problem difficulty.
   *
   * Valid:
   *
   * Easy
   * Medium
   * Hard
   *
   * Do NOT use:
   *
   * Beginner
   * Intermediate
   * Advanced
   */

  difficulty: ProblemDifficulty;

  /*
   * Workspace required for
   * this problem.
   */

  workspaceType: WorkspaceType;

  /*
   * Short description shown
   * on ProblemCard.
   */

  shortDescription: string;

  /*
   * Full problem statement shown
   * inside the coding workspace.
   */

  problemStatement: string;

  /* =======================================================
     STRUCTURED PROBLEM DESCRIPTION
  ======================================================= */

  inputFormat?: string;

  outputFormat?: string;

  constraints?: string[];

  notes?: string[];

  /* =======================================================
     SKILLS
  ======================================================= */

  skills: string[];

  /*
   * Expected learner time.
   */

  estimatedMinutes: number;

  /* =======================================================
     LANGUAGE
  ======================================================= */

  /*
   * Main language loaded
   * automatically into Monaco.
   *
   * Examples:
   *
   * c
   * cpp
   */

  defaultLanguage: ProblemLanguage;

  /*
   * Languages learner is allowed
   * to use for this problem.
   */

  allowedLanguages: ProblemLanguage[];

  /* =======================================================
     SINGLE-FILE CODING PROBLEM
  ======================================================= */

  starterCode?: string;

  /* =======================================================
     MULTI-FILE WORKSPACE
  ======================================================= */

  starterFiles?: StarterFile[];

  /* =======================================================
     PUBLIC SAMPLE TESTS

     These can safely be sent
     to the frontend.

     Hidden tests stay in:
     API / database.
  ======================================================= */

  sampleTests?: SampleTestCase[];
};

/* =========================================================
   PROBLEM CONTEXT

   Describes how the learner
   reached the shared workspace.
========================================================= */

export type ProblemContext = {
  source: ProblemSource;

  /* =======================================================
     PRACTICE
  ======================================================= */

  technologySlug?: string;

  /* =======================================================
     STACK
  ======================================================= */

  domainSlug?: string;

  stackSlug?: string;

  moduleSlug?: string;

  /* =======================================================
     CHALLENGE
  ======================================================= */

  challengeSlug?: string;

  attemptId?: string;
};