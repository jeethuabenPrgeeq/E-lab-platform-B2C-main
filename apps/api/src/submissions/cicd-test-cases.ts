type HiddenTestCase = {
  expectedOutput: string;
  setupScript?: string;
  verifyScript?: string;
};

export function getCicdTestCases(problemSlug: string): HiddenTestCase[] {
  if (problemSlug === 'write-a-github-actions-workflow') {
    return [
      {
        expectedOutput: 'PASS',
        setupScript: '',
        verifyScript: `
test -f workflow.yaml || { echo "workflow.yaml not found"; exit 1; }
grep -qE '^on:' workflow.yaml || { echo "Missing on: trigger"; exit 1; }
grep -qE '^jobs:' workflow.yaml || { echo "Missing jobs: key"; exit 1; }
grep -qE '^\\s*steps:' workflow.yaml || { echo "Missing steps: key"; exit 1; }
echo "PASS"
        `.trim(),
      },
    ];
  }

  return [];
}