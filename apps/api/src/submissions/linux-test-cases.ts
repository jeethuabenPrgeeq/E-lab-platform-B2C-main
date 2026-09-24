type LinuxTestCase = {
  expectedOutput: string;

  setupScript: string;

  verifyScript: string;
};

const linuxTestCases: Record<string, LinuxTestCase[]> = {
  'linux-create-project-folder': [
    {
      setupScript: '',

      verifyScript:
        'if [ -d project ] && [ -f project/notes.txt ] && [ ! -s project/notes.txt ]; then echo PASS; else echo FAIL; fi',

      expectedOutput: 'PASS',
    },
  ],
};

export function getLinuxTestCases(problemSlug: string): LinuxTestCase[] {
  return linuxTestCases[problemSlug] ?? [];
}