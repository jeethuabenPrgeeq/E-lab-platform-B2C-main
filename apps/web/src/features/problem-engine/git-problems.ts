import type { PracticeProblem } from "./types";

/* =========================================================
   HELPER
========================================================= */

type GitProblemInput = Omit<PracticeProblem, "technologySlug" | "workspaceType" | "defaultLanguage" | "allowedLanguages">;

function gitProblem(problem: GitProblemInput): PracticeProblem {
  return {
    ...problem,

    technologySlug: "git",

    workspaceType: "devops",

    defaultLanguage: "git",

    allowedLanguages: ["git"],
  };
}

/* =========================================================
   GIT PROBLEMS
========================================================= */

export const gitProblems: PracticeProblem[] = [
  /* =======================================================
     FUNDAMENTALS
  ======================================================= */

  gitProblem({
    slug: "git-create-feature-branch",

    title: "Create a Feature Branch",

    difficulty: "Easy",

    shortDescription: "Create a branch, add a file, and commit it.",

    problemStatement: 'A repository already has an initial commit on main. Create a new branch called feature, switch to it, create a file named login.txt, stage it, and commit it with a message containing "Add login".',

    outputFormat: "Your commands are checked against the resulting repository state. Each requirement is printed as PASS or FAIL.",

    constraints: ["The branch must be named exactly feature.", "The file must be named exactly login.txt.", 'The commit message must contain the text "Add login".'],

    skills: ["git checkout -b", "git add", "git commit"],

    estimatedMinutes: 10,

    starterCode: `# Write your git commands here, one per line.
        # Example:
        # git checkout -b my-branch
        `,

    sampleTests: [
      {
        id: "sample-1",

        title: "Expected Result",

        expectedOutput: `Branch created: PASS
          File committed: PASS
          Commit message correct: PASS`,
      },
    ],
  }),

  gitProblem({
    slug: "git-push-to-remote",

    title: "Push a Commit to the Remote",

    difficulty: "Easy",

    shortDescription: "Make a change locally and push it to origin.",

    problemStatement: 'You already have a local clone of a project, connected to a remote named origin. Create a file named notes.txt containing any text, commit it, and push it to the main branch on origin.',

    outputFormat: "Your commands are checked against the resulting state of the remote repository (not just your local copy). Each requirement is printed as PASS or FAIL.",

    constraints: ["The file must be named exactly notes.txt.", 'The commit message must contain the text "Add notes".', "The commit must actually reach origin — a local-only commit does not pass."],

    skills: ["git add", "git commit", "git push"],

    estimatedMinutes: 10,

    starterCode: `# Write your git commands here, one per line.
      # You already have a clone of the project with
      # a remote named origin.
      `,

    sampleTests: [
      {
        id: "sample-1",

        title: "Expected Result",

        expectedOutput: `Commit pushed to remote: PASS
          notes.txt present on remote: PASS`,
      },
    ],
  }),
];
