import type { PracticeProblem } from "./types";

type KubernetesProblemInput = Omit<PracticeProblem, "technologySlug" | "workspaceType" | "defaultLanguage" | "allowedLanguages">;

function kubernetesProblem(problem: KubernetesProblemInput): PracticeProblem {
  return {
    ...problem,
    technologySlug: "kubernetes",
    workspaceType: "devops",
    defaultLanguage: "kubernetes",
    allowedLanguages: ["kubernetes"],
  };
}

export const kubernetesProblems: PracticeProblem[] = [
  kubernetesProblem({
    slug: "write-a-pod-manifest",
    title: "Write a Pod Manifest",
    difficulty: "Easy",
    shortDescription: "Write a Kubernetes Pod manifest for a single container.",
    problemStatement: "Create a file named pod.yaml that defines a Kubernetes Pod running a container image.",
    outputFormat: "Your pod.yaml is checked for the required fields. Each requirement is printed as PASS or FAIL.",
    constraints: ["Must set apiVersion: v1.", "Must set kind: Pod.", "Must define an image under containers."],
    skills: ["Kubernetes", "Pod", "YAML", "apiVersion", "kind"],
    estimatedMinutes: 8,
    starterCode: `# Write your shell commands here, one per line.\n# Example:\n# cat > pod.yaml << 'EOF'\n# ...\n# EOF\n`,
    sampleTests: [
      { id: "sample-1", title: "Expected Result", expectedOutput: `PASS` },
    ],
  }),
];
