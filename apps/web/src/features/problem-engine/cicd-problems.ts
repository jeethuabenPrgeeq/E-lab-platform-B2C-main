import type { PracticeProblem } from "./types";

type CicdProblemInput = Omit<PracticeProblem, "technologySlug" | "workspaceType" | "defaultLanguage" | "allowedLanguages">;

function cicdProblem(problem: CicdProblemInput): PracticeProblem {
  return {
    ...problem,
    technologySlug: "cicd",
    workspaceType: "devops",
    defaultLanguage: "cicd",
    allowedLanguages: ["cicd"],
  };
}

export const cicdProblems: PracticeProblem[] = [
  cicdProblem({
    slug: "write-a-github-actions-workflow",
    title: "Write a GitHub Actions Workflow",
    difficulty: "Easy",
    shortDescription: "Write a CI workflow file that runs on a trigger with jobs and steps.",
    problemStatement: "Create a file named workflow.yaml that defines a GitHub Actions workflow with a trigger, at least one job, and steps.",
    outputFormat: "Your workflow.yaml is checked for the required keys. Each requirement is printed as PASS or FAIL.",
    constraints: ["Must define an on: trigger.", "Must define a jobs: key.", "Must define a steps: key under a job."],
    skills: ["CI/CD", "GitHub Actions", "YAML", "Workflows"],
    estimatedMinutes: 10,
    starterCode: `# Write your shell commands here, one per line.\n# Example:\n# cat > workflow.yaml << 'EOF'\n# ...\n# EOF\n`,
    sampleTests: [
      { id: "sample-1", title: "Expected Result", expectedOutput: `PASS` },
    ],
  }),
];
