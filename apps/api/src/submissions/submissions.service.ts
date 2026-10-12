import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

import { getCTestCases } from './c-test-cases.js';
import { getCppTestCases } from './cpp-test-cases.js';
import { getJavaTestCases } from './java-test-cases.js';
import { getCsharpTestCases } from './csharp-test-cases.js';
import { getPythonTestCases } from './python-test-cases.js';
import { getGoTestCases } from './go-test-cases.js';
import { getRubyTestCases } from './ruby-test-cases.js';
import { getSwiftTestCases } from './swift-test-cases.js';
import { getGitTestCases } from './git-test-cases.js';
import { getLinuxTestCases } from './linux-test-cases.js';
import { getDockerTestCases } from './docker-test-cases.js';
import { getKubernetesTestCases } from './kubernetes-test-cases.js';
import { getCicdTestCases } from './cicd-test-cases.js';
import { JudgeGateway, type RunRecord } from '../judge/judge-gateway.service.js';
import type { JudgeLimits } from '../judge/judge-settings.service.js';

/* =========================================================
   TYPES
========================================================= */

type SubmissionRequest = {
  problemSlug: string;
  language: string;
  code: string;
  context?: {
    source?: string;
    technology?: string | null;
    domain?: string | null;
    stack?: string | null;
    module?: string | null;
    challenge?: string | null;
    attempt?: string | null;
  };
};

type HiddenTestCase = {
  input?: string;
  expectedOutput: string;

  /*
   * Git only — see git-test-cases.ts.
   * Every other language leaves these
   * undefined and uses input instead.
   */

  setupScript?: string;
  verifyScript?: string;
};

type JudgeResponse = {
  language?: string;

  status:
    | 'SUCCESS'
    | 'COMPILATION_ERROR'
    | 'RUNTIME_ERROR'
    | 'TIME_LIMIT_EXCEEDED'
    | 'UNSUPPORTED_LANGUAGE'
    | 'INVALID_REQUEST'
    | 'INTERNAL_ERROR';

  output?: string;
  stderr?: string;
  exitCode?: number | null;
  message?: string;
};

const VERDICT: Record<string, string> = {
  ACCEPTED: 'ac',
  WRONG_ANSWER: 'wa',
  TIME_LIMIT_EXCEEDED: 'tle',
  RUNTIME_ERROR: 're',
  COMPILATION_ERROR: 'ce',
};

const VERDICT_OUTCOME: Record<string, string> = {
  ac: 'ok',
  wa: 'wrong',
  tle: 'tle',
  re: 're',
  ce: 'ce',
};

/* =========================================================
   SUPPORTED SUBMISSION LANGUAGES
========================================================= */

const SUPPORTED_LANGUAGES = [
  'c',
  'cpp',
  'java',
  'csharp',
  'python',
  'go',
  'ruby',
  'swift',
  'git',
  'linux',
  'docker',
  'kubernetes',
  'cicd',
] as const;

/* =========================================================
   SERVICE
========================================================= */

@Injectable()
export class SubmissionsService implements OnModuleInit {
  constructor(private readonly gateway: JudgeGateway) {}

  onModuleInit() {
    this.gateway.register('submit', async (job, judgeUrl, limits) => {
      const result = await this.evaluate(
        {
          problemSlug: job.problemSlug,
          language: job.language,
          code: job.code,
        },
        judgeUrl,
        limits,
      );
      return { response: result, record: this.toRecord(result) };
    });
  }

  private toRecord(
    result: Awaited<ReturnType<SubmissionsService['evaluate']>>,
  ): RunRecord {
    const verdict = VERDICT[result.status] ?? 'wa';
    return {
      outcome: VERDICT_OUTCOME[verdict],
      verdict,
      testsPassed: result.passedTests,
      testsTotal: result.totalTests,
      stdout: result.results
        .map((item) => item.output)
        .filter(Boolean)
        .join('\n')
        .slice(0, 2000),
      stderr: result.results
        .map((item) => item.stderr)
        .filter(Boolean)
        .join('\n')
        .slice(0, 2000),
      results: result.results.map((item) => ({
        testNumber: item.testNumber,
        passed: item.passed,
        status: item.status,
        output: (item.output ?? '').slice(0, 500),
        expectedOutput: (item.expectedOutput ?? '').slice(0, 500),
      })),
    };
  }

  async submit(body: SubmissionRequest, userId: string | null = null) {
    const language = this.validate(body);
    const { response } = await this.gateway.execute({
      kind: 'submit',
      userId,
      problemSlug: body.problemSlug,
      language,
      workspaceType: '',
      code: body.code,
    });
    return { ...(response as Record<string, unknown>), context: body.context };
  }

  async rejudge(
    run: {
      id: string;
      userId: string | null;
      problemSlug: string;
      language: string;
      code: string;
    },
    rejudgeJobId: string,
  ) {
    const { response } = await this.gateway.execute({
      kind: 'submit',
      userId: run.userId,
      problemSlug: run.problemSlug,
      language: run.language,
      workspaceType: '',
      code: run.code,
      rejudgeJobId,
      rejudgeOfId: run.id,
    });
    return this.toRecord(
      response as Awaited<ReturnType<SubmissionsService['evaluate']>>,
    );
  }

  private validate(body: SubmissionRequest) {
    if (!body.problemSlug || !body.problemSlug.trim())
      throw new BadRequestException('Problem slug is required.');
    if (!body.language || !body.language.trim())
      throw new BadRequestException('Language is required.');
    if (!body.code || !body.code.trim())
      throw new BadRequestException('Code is required.');
    const language = this.normalizeLanguage(body.language);
    if (
      !SUPPORTED_LANGUAGES.includes(
        language as (typeof SUPPORTED_LANGUAGES)[number],
      )
    )
      throw new BadRequestException(
        `Unsupported submission language: ${body.language}`,
      );
    if (this.getHiddenTests(language, body.problemSlug).length === 0)
      throw new BadRequestException(
        `No hidden test cases configured for ${body.problemSlug}.`,
      );
    return language;
  }

  private readonly judgeUrl = process.env.JUDGE_URL ?? 'http://127.0.0.1:4100';

  /* =======================================================
     NORMALIZE LANGUAGE
  ======================================================= */

  private normalizeLanguage(language: string) {
    const normalized = language.trim().toLowerCase();
    if (normalized === 'c++' || normalized === 'cplusplus') {
      return 'cpp';
    }
    return normalized;
  }

  /* =======================================================
     NORMALIZE OUTPUT

     Avoid failure only because of:
     \n
     \r\n
     trailing spaces/newlines
  ======================================================= */

  private normalizeOutput(value: string) {
    return value.replace(/\r\n/g, '\n').trim();
  }

  private async fetchJudgeWithRetry(
    url: string,
    init: RequestInit,
    retries = 2,
    delayMs = 500,
  ): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetch(url, init);
      } catch (error) {
        lastError = error;

        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    console.error('Unable to connect to judge after retries:', lastError);
    throw new BadGatewayException('Unable to connect to the code judge.');
  }

  /* =======================================================
     GET HIDDEN TESTS

     C      → c-test-cases.ts
     C++    → cpp-test-cases.ts
     Java   → java-test-cases.ts
     C#     → csharp-test-cases.ts
     Python → python-test-cases.ts
     Go     → go-test-cases.ts
     Ruby   → ruby-test-cases.ts
     Swift  → swift-test-cases.ts
     Git    → git-test-cases.ts
  ======================================================= */

  private getHiddenTests(
    language: string,
    problemSlug: string,
  ): HiddenTestCase[] {
    if (language === 'c') {
      return getCTestCases(problemSlug);
    }

    if (language === 'cpp') {
      return getCppTestCases(problemSlug);
    }

    if (language === 'java') {
      return getJavaTestCases(problemSlug);
    }

    if (language === 'csharp') {
      return getCsharpTestCases(problemSlug);
    }

    if (language === 'python') {
      return getPythonTestCases(problemSlug);
    }

    if (language === 'go') {
      return getGoTestCases(problemSlug);
    }

    if (language === 'ruby') {
      return getRubyTestCases(problemSlug);
    }

    if (language === 'swift') {
      return getSwiftTestCases(problemSlug);
    }

    if (language === 'git') {
      return getGitTestCases(problemSlug);
    }

    if (language === 'linux') {
      return getLinuxTestCases(problemSlug);
    }

    if (language === 'docker') {
      return getDockerTestCases(problemSlug);
    }

    if (language === 'kubernetes') {
      return getKubernetesTestCases(problemSlug);
    }

    if (language === 'cicd') {
      return getCicdTestCases(problemSlug);
    }

    return [];
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  private async evaluate(
    body: SubmissionRequest,
    judgeUrl: string,
    limits: JudgeLimits,
  ) {
    /* =====================================================
       VALIDATE PROBLEM
    ===================================================== */

    if (!body.problemSlug || !body.problemSlug.trim()) {
      throw new BadRequestException('Problem slug is required.');
    }

    /* =====================================================
       VALIDATE LANGUAGE
    ===================================================== */

    if (!body.language || !body.language.trim()) {
      throw new BadRequestException('Language is required.');
    }

    /* =====================================================
       VALIDATE CODE
    ===================================================== */

    if (!body.code || !body.code.trim()) {
      throw new BadRequestException('Code is required.');
    }

    /* =====================================================
       NORMALIZE LANGUAGE
    ===================================================== */

    const language = this.normalizeLanguage(body.language);

    /* =====================================================
       SUPPORT C + C++
    ===================================================== */

    if (
      !SUPPORTED_LANGUAGES.includes(
        language as (typeof SUPPORTED_LANGUAGES)[number],
      )
    ) {
      throw new BadRequestException(
        `Unsupported submission language: ${body.language}`,
      );
    }

    /* =====================================================
       GET HIDDEN TEST CASES
    ===================================================== */

    const testCases = this.getHiddenTests(language, body.problemSlug);

    if (testCases.length === 0) {
      throw new BadRequestException(
        `No hidden test cases configured for ${body.problemSlug}.`,
      );
    }

    /* =====================================================
       RESULTS
    ===================================================== */

    const results: Array<{
      testNumber: number;
      passed: boolean;
      status: string;
      output: string;
      expectedOutput: string;
      stderr: string;
    }> = [];

    let passedTests = 0;

    /* =====================================================
       RUN EVERY HIDDEN TEST
    ===================================================== */

    for (let index = 0; index < testCases.length; index += 1) {
      const testCase = testCases[index];

      const response = await this.fetchJudgeWithRetry(`${judgeUrl}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          language,
          code: body.code,
          limits,
          ...(language === 'git' ||
          language === 'linux' ||
          language === 'docker' ||
          language === 'kubernetes' ||
          language === 'cicd'
            ? {
                setupScript: testCase.setupScript,
                verifyScript: testCase.verifyScript,
              }
            : {
                input: testCase.input,
              }),
        }),
      });

      /* ===================================================
         PARSE JUDGE RESPONSE
      =================================================== */

      let judgeResult: JudgeResponse;

      try {
        judgeResult = (await response.json()) as JudgeResponse;
      } catch {
        throw new BadGatewayException(
          'Invalid response received from code judge.',
        );
      }

      /* ===================================================
         JUDGE HTTP ERROR
      =================================================== */

      if (!response.ok) {
        throw new BadGatewayException(
          judgeResult.message ?? 'Judge rejected the submission.',
        );
      }

      /* ===================================================
         COMPILATION ERROR

         No need to execute remaining
         test cases.
      =================================================== */

      if (judgeResult.status === 'COMPILATION_ERROR') {
        return {
          problemSlug: body.problemSlug,
          language,
          status: 'COMPILATION_ERROR',
          passedTests: 0,
          totalTests: testCases.length,
          results: [
            {
              testNumber: 1,
              passed: false,
              status: 'COMPILATION_ERROR',
              output: judgeResult.output ?? '',
              expectedOutput: '',
              stderr: judgeResult.stderr ?? '',
            },
          ],

          context: body.context,
        };
      }

      /* ===================================================
         TIME LIMIT
      =================================================== */

      if (judgeResult.status === 'TIME_LIMIT_EXCEEDED') {
        return {
          problemSlug: body.problemSlug,
          language,
          status: 'TIME_LIMIT_EXCEEDED',
          passedTests,
          totalTests: testCases.length,
          results: [
            ...results,

            {
              testNumber: index + 1,
              passed: false,
              status: 'TIME_LIMIT_EXCEEDED',
              output: judgeResult.output ?? '',
              expectedOutput: testCase.expectedOutput,
              stderr: judgeResult.stderr ?? '',
            },
          ],

          context: body.context,
        };
      }

      /* ===================================================
         RUNTIME ERROR
      =================================================== */

      if (judgeResult.status === 'RUNTIME_ERROR') {
        return {
          problemSlug: body.problemSlug,
          language,
          status: 'RUNTIME_ERROR',
          passedTests,
          totalTests: testCases.length,
          results: [
            ...results,

            {
              testNumber: index + 1,
              passed: false,
              status: 'RUNTIME_ERROR',
              output: judgeResult.output ?? '',
              expectedOutput: testCase.expectedOutput,
              stderr: judgeResult.stderr ?? '',
            },
          ],
          context: body.context,
        };
      }

      /* ===================================================
         COMPARE OUTPUT
      =================================================== */

      const actualOutput = this.normalizeOutput(judgeResult.output ?? '');
      const expectedOutput = this.normalizeOutput(testCase.expectedOutput);
      const passed =
        judgeResult.status === 'SUCCESS' && actualOutput === expectedOutput;

      if (passed) {
        passedTests += 1;
      }

      results.push({
        testNumber: index + 1,
        passed,
        status: passed ? 'PASSED' : 'FAILED',
        output: actualOutput,
        expectedOutput,
        stderr: judgeResult.stderr ?? '',
      });
    }

    /* =====================================================
       FINAL SUBMISSION RESULT
    ===================================================== */

    const totalTests = testCases.length;
    const allTestsPassed = totalTests > 0 && passedTests === totalTests;
    const score =
      totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    return {
      problemSlug: body.problemSlug,
      language,
      status: allTestsPassed ? 'ACCEPTED' : 'WRONG_ANSWER',
      passedTests,
      totalTests,
      score,
      results,
      context: body.context,
    };
  }

  /* =======================================================
     GET GIT SETUP SCRIPT

     Used by the live terminal to prepare the starting
     repo state before the learner types anything —
     same test case data Submit already uses.
  ======================================================= */

  getGitSetupScript(problemSlug: string) {
    const testCases = getGitTestCases(problemSlug);
    const testCase = testCases[0];
    if (!testCase) {
      throw new BadRequestException(
        `No git task configured for ${problemSlug}.`,
      );
    }

    return {
      setupScript: testCase.setupScript,
    };
  }

  getLinuxSetupScript(problemSlug: string) {
    const testCases = getLinuxTestCases(problemSlug);
    const testCase = testCases[0];
    if (!testCase) {
      throw new BadRequestException(
        `No linux task configured for ${problemSlug}.`,
      );
    }

    return {
      setupScript: testCase.setupScript,
    };
  }

  async checkLinuxSession(problemSlug: string, containerName: string) {
    const testCases = getLinuxTestCases(problemSlug);
    const testCase = testCases[0];
    if (!testCase) {
      throw new BadRequestException(
        `No linux task configured for ${problemSlug}.`,
      );
    }

    const response = await this.fetchJudgeWithRetry(
      `${this.judgeUrl}/verify-session-linux`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          containerName,
          verifyScript: testCase.verifyScript,
        }),
      },
    );

    const judgeResult = await response.json();
    const actualOutput = this.normalizeOutput(judgeResult.output ?? '');
    const expectedOutput = this.normalizeOutput(testCase.expectedOutput);
    const passed =
      judgeResult.status === 'SUCCESS' && actualOutput === expectedOutput;

    return {
      status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
      output: actualOutput,
      expectedOutput,
    };
  }

  getDockerSetupScript(problemSlug: string) {
    const testCases = getDockerTestCases(problemSlug);
    const testCase = testCases[0];
    if (!testCase) {
      throw new BadRequestException(
        `No docker task configured for ${problemSlug}.`,
      );
    }
    return { setupScript: testCase.setupScript };
  }

  async checkDockerSession(problemSlug: string, containerName: string) {
    const testCases = getDockerTestCases(problemSlug);
    const testCase = testCases[0];
    if (!testCase) {
      throw new BadRequestException(
        `No docker task configured for ${problemSlug}.`,
      );
    }
    const response = await this.fetchJudgeWithRetry(
      `${this.judgeUrl}/verify-session-docker`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerName,
          verifyScript: testCase.verifyScript,
        }),
      },
    );
    const judgeResult = await response.json();
    const actualOutput = this.normalizeOutput(judgeResult.output ?? '');
    const expectedOutput = this.normalizeOutput(testCase.expectedOutput);
    const passed =
      judgeResult.status === 'SUCCESS' && actualOutput === expectedOutput;
    return {
      status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
      output: actualOutput,
      expectedOutput,
    };
  }

  getKubernetesSetupScript(problemSlug: string) {
    const testCases = getKubernetesTestCases(problemSlug);
    const testCase = testCases[0];
    if (!testCase) {
      throw new BadRequestException(
        `No kubernetes task configured for ${problemSlug}.`,
      );
    }
    return { setupScript: testCase.setupScript };
  }

  async checkKubernetesSession(problemSlug: string, containerName: string) {
    const testCases = getKubernetesTestCases(problemSlug);
    const testCase = testCases[0];
    if (!testCase) {
      throw new BadRequestException(
        `No kubernetes task configured for ${problemSlug}.`,
      );
    }
    const response = await this.fetchJudgeWithRetry(
      `${this.judgeUrl}/verify-session-kubernetes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerName,
          verifyScript: testCase.verifyScript,
        }),
      },
    );
    const judgeResult = await response.json();
    const actualOutput = this.normalizeOutput(judgeResult.output ?? '');
    const expectedOutput = this.normalizeOutput(testCase.expectedOutput);
    const passed =
      judgeResult.status === 'SUCCESS' && actualOutput === expectedOutput;
    return {
      status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
      output: actualOutput,
      expectedOutput,
    };
  }

  getCicdSetupScript(problemSlug: string) {
    const testCases = getCicdTestCases(problemSlug);
    const testCase = testCases[0];
    if (!testCase) {
      throw new BadRequestException(
        `No cicd task configured for ${problemSlug}.`,
      );
    }
    return { setupScript: testCase.setupScript };
  }

  async checkCicdSession(problemSlug: string, containerName: string) {
    const testCases = getCicdTestCases(problemSlug);
    const testCase = testCases[0];
    if (!testCase) {
      throw new BadRequestException(
        `No cicd task configured for ${problemSlug}.`,
      );
    }
    const response = await this.fetchJudgeWithRetry(
      `${this.judgeUrl}/verify-session-cicd`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerName,
          verifyScript: testCase.verifyScript,
        }),
      },
    );
    const judgeResult = await response.json();
    const actualOutput = this.normalizeOutput(judgeResult.output ?? '');
    const expectedOutput = this.normalizeOutput(testCase.expectedOutput);
    const passed =
      judgeResult.status === 'SUCCESS' && actualOutput === expectedOutput;
    return {
      status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
      output: actualOutput,
      expectedOutput,
    };
  }

  /* =======================================================
     CHECK GIT LIVE SESSION (PHASE 3)

     Runs verifyScript inside the learner's existing
     live container via the Judge, then reuses the
     exact same comparison logic Submit already uses.
  ======================================================= */

  async checkGitSession(problemSlug: string, containerName: string) {
    const testCases = getGitTestCases(problemSlug);

    const testCase = testCases[0];

    if (!testCase) {
      throw new BadRequestException(
        `No git task configured for ${problemSlug}.`,
      );
    }

    const response = await this.fetchJudgeWithRetry(
      `${this.judgeUrl}/verify-session`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          containerName,

          verifyScript: testCase.verifyScript,
        }),
      },
    );

    const judgeResult = await response.json();

    const actualOutput = this.normalizeOutput(judgeResult.output ?? '');

    const expectedOutput = this.normalizeOutput(testCase.expectedOutput);

    const passed =
      judgeResult.status === 'SUCCESS' && actualOutput === expectedOutput;

    return {
      status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',

      output: actualOutput,

      expectedOutput,
    };
  }
}
