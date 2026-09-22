import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { getGitTestCases } from '../submissions/git-test-cases.js';

/* =========================================================
   EXECUTION REQUEST
========================================================= */

export type ExecutionRequest = {
  problemSlug: string;

  language: string;

  workspaceType: string;

  code: string;

  input?: string;

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

/* =========================================================
   JUDGE RESPONSE
========================================================= */

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

/* =========================================================
   SUPPORTED LANGUAGES
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
] as const;

/* =========================================================
   SERVICE
========================================================= */

@Injectable()
export class ExecutionsService {
  private readonly judgeUrl = process.env.JUDGE_URL ?? 'http://127.0.0.1:4100';

  /* =======================================================
     NORMALIZE LANGUAGE
  ======================================================= */

  private normalizeLanguage(language: string): string {
    const normalized = language.trim().toLowerCase();

    if (normalized === 'c++' || normalized === 'cplusplus') {
      return 'cpp';
    }

    return normalized;
  }

  /* =======================================================
     RUN
  ======================================================= */

  async run(body: ExecutionRequest) {
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
       CHECK SUPPORTED LANGUAGE

      Current:
       - C
       - C++
       - Java
       - C#
       - Python
       - GO
       - Ruby
       - Swift
       - Git
    ===================================================== */

    if (
      !SUPPORTED_LANGUAGES.includes(
        language as (typeof SUPPORTED_LANGUAGES)[number],
      )
    ) {
      throw new BadRequestException(`Unsupported language: ${body.language}`);
    }

    const gitTestCase =
      language === 'git' ? getGitTestCases(body.problemSlug)[0] : undefined;

    if (language === 'git' && !gitTestCase) {
      throw new BadRequestException(
        `No git task configured for ${body.problemSlug}.`,
      );
    }

    /* =====================================================
       SEND TO JUDGE
    ===================================================== */

    try {
      const response = await fetch(`${this.judgeUrl}/run`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          /*
           * c   → gcc
           * cpp → g++
           */

          language,

          code: body.code,

          ...(language === 'git'
            ? {
                setupScript: gitTestCase!.setupScript,

                verifyScript: gitTestCase!.verifyScript,
              }
            : {
                input: body.input ?? '',
              }),
        }),
      });

      /* ===================================================
         PARSE JUDGE RESPONSE
      =================================================== */

      const result = (await response.json()) as JudgeResponse;

      /* ===================================================
         JUDGE HTTP ERROR
      =================================================== */

      if (!response.ok) {
        throw new BadGatewayException(
          result.message ?? 'Judge rejected the execution request.',
        );
      }

      /* ===================================================
         RETURN RESULT TO EDITOR
      =================================================== */

      return {
        problemSlug: body.problemSlug,

        language,

        workspaceType: body.workspaceType,

        context: body.context,

        status: result.status,

        output: result.output ?? '',

        stderr: result.stderr ?? '',

        exitCode: result.exitCode ?? null,

        message: result.message,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      console.error('Execution service error:', error);

      throw new BadGatewayException('Unable to connect to the code judge.');
    }
  }
}
