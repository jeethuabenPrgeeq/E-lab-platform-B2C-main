type DockerTestCase = {
  expectedOutput: string;
  setupScript: string;
  verifyScript: string;
};

const dockerTestCases: Record<string, DockerTestCase[]> = {
  'docker-write-a-dockerfile': [
    {
      setupScript: '',
      verifyScript:
        'if [ -f Dockerfile ] && grep -qE "^FROM[[:space:]]+node" Dockerfile && grep -qE "^WORKDIR" Dockerfile && grep -qE "^CMD" Dockerfile; then echo PASS; else echo FAIL; fi',
      expectedOutput: 'PASS',
    },
  ],
};

export function getDockerTestCases(problemSlug: string): DockerTestCase[] {
  return dockerTestCases[problemSlug] ?? [];
}