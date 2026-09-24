import type { PracticeProblem } from "./types";

type DockerProblemInput = Omit<PracticeProblem, "technologySlug" | "workspaceType" | "defaultLanguage" | "allowedLanguages">;

function dockerProblem(problem: DockerProblemInput): PracticeProblem {
  return {
    ...problem,
    technologySlug: "docker",
    workspaceType: "devops",
    defaultLanguage: "docker",
    allowedLanguages: ["docker"],
  };
}

export const dockerProblems: PracticeProblem[] = [
  dockerProblem({
    slug: "docker-write-a-dockerfile",
    title: "Write a Node.js Dockerfile",
    difficulty: "Easy",
    shortDescription: "Write a Dockerfile that containerizes a Node.js app.",
    problemStatement: "Create a file named Dockerfile in the current directory that builds a Node.js application image.",
    outputFormat: "Your Dockerfile is checked for the required instructions. Each requirement is printed as PASS or FAIL.",
    constraints: ["Must have a line starting with FROM node.", "Must have a line starting with WORKDIR.", "Must have a line starting with CMD."],
    skills: ["Dockerfile", "FROM", "WORKDIR", "CMD"],
    estimatedMinutes: 8,
    starterCode: `# Write your shell commands here, one per line.\n# Example:\n# cat > Dockerfile << 'EOF'\n# ...\n# EOF\n`,
    sampleTests: [
      { id: "sample-1", title: "Expected Result", expectedOutput: `PASS` },
    ],
  }),
];