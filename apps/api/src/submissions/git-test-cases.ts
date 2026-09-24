export type GitTestCase = {
  setupScript: string;

  verifyScript: string;

  expectedOutput: string;
};

const gitTestCases: Record<string, GitTestCase[]> = {
  'git-create-feature-branch': [
    {
      setupScript: `git init -q
echo "# Project" > README.md
git add README.md
git commit -q -m "Initial commit"`,

      verifyScript: `CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "feature" ]; then
  echo "Branch created: PASS"
else
  echo "Branch created: FAIL"
fi

if git ls-files --error-unmatch login.txt > /dev/null 2>&1; then
  echo "File committed: PASS"
else
  echo "File committed: FAIL"
fi

if git log --oneline -- login.txt | grep -qi "add login"; then
  echo "Commit message correct: PASS"
else
  echo "Commit message correct: FAIL"
fi`,

      expectedOutput: `Branch created: PASS
File committed: PASS
Commit message correct: PASS`,
    },
  ],

  'git-push-to-remote': [
    {
      setupScript: `git init --bare -q /tmp/remote.git

cd /tmp
mkdir -p /tmp/seed
cd /tmp/seed
git init -q
echo "# Project" > README.md
git add README.md
git commit -q -m "Initial commit"
git remote add origin /tmp/remote.git
git push -q origin main
cd /tmp
rm -rf /tmp/seed

cd /tmp/repo
git clone -q /tmp/remote.git .`,

      verifyScript: `cd /tmp/remote.git

if git log main --oneline 2>/dev/null | grep -qi "add notes"; then
  echo "Commit pushed to remote: PASS"
else
  echo "Commit pushed to remote: FAIL"
fi

if git show main:notes.txt > /dev/null 2>&1; then
  echo "notes.txt present on remote: PASS"
else
  echo "notes.txt present on remote: FAIL"
fi`,

      expectedOutput: `Commit pushed to remote: PASS
notes.txt present on remote: PASS`,
    },
  ],
};

export function getGitTestCases(problemSlug: string): GitTestCase[] {
  return gitTestCases[problemSlug] ?? [];
}

