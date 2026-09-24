import type { PracticeProblem } from "./types";

/* =========================================================
   HELPER
========================================================= */

type LinuxProblemInput = Omit<PracticeProblem, "technologySlug" | "workspaceType" | "defaultLanguage" | "allowedLanguages">;

function linuxProblem(problem: LinuxProblemInput): PracticeProblem {
  return {
    ...problem,

    technologySlug: "linux",

    workspaceType: "devops",

    defaultLanguage: "linux",

    allowedLanguages: ["linux"],
  };
}

/* =========================================================
   LINUX PROBLEMS
========================================================= */

export const linuxProblems: PracticeProblem[] = [
  linuxProblem({
    slug: "linux-create-project-folder",

    title: "Create a Project Folder",

    difficulty: "Easy",

    shortDescription: "Create a folder and an empty file inside it.",

    problemStatement: "You're working in an empty directory. Create a folder named project, and inside it create an empty file named notes.txt.",

    outputFormat: "Your commands are checked against the resulting filesystem state. Each requirement is printed as PASS or FAIL.",

    constraints: ["The folder must be named exactly project.", "The file must be named exactly notes.txt and must be empty."],

    skills: ["mkdir", "touch"],

    estimatedMinutes: 5,

    starterCode: `# Write your shell commands here, one per line.
# Example:
# mkdir my-folder
`,

    sampleTests: [
      {
        id: "sample-1",

        title: "Expected Result",

        expectedOutput: `Folder created: PASS
File created: PASS`,
      },
    ],
  }),
];