type HiddenTestCase = {
  expectedOutput: string;
  setupScript?: string;
  verifyScript?: string;
};

export function getKubernetesTestCases(problemSlug: string): HiddenTestCase[] {
  if (problemSlug === 'write-a-pod-manifest') {
    return [
      {
        expectedOutput: 'PASS',
        setupScript: '',
        verifyScript: `
test -f pod.yaml || { echo "pod.yaml not found"; exit 1; }
grep -qE '^apiVersion:[[:space:]]*v1' pod.yaml || { echo "Missing apiVersion: v1"; exit 1; }
grep -qE '^kind:[[:space:]]*Pod' pod.yaml || { echo "Missing kind: Pod"; exit 1; }
grep -qE '^\\s*image:' pod.yaml || { echo "Missing image field"; exit 1; }
echo "PASS"
        `.trim(),
      },
    ];
  }

  return [];
}