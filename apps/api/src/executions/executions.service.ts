import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';

import { JudgeGateway, type JobPayload, type RunRecord } from '../judge/judge-gateway.service.js';
import type { JudgeLimits } from '../judge/judge-settings.service.js';
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

const OUTCOME: Record<JudgeResponse['status'], string> = {
  SUCCESS: 'ok',
  COMPILATION_ERROR: 'ce',
  RUNTIME_ERROR: 're',
  TIME_LIMIT_EXCEEDED: 'tle',
  UNSUPPORTED_LANGUAGE: 'sandbox',
  INVALID_REQUEST: 'sandbox',
  INTERNAL_ERROR: 'sandbox',
};

/* =========================================================
   SERVICE
========================================================= */

@Injectable()
export class ExecutionsService implements OnModuleInit {
  constructor(private readonly gateway: JudgeGateway) {}

  onModuleInit() {
    this.gateway.register('run', (job, judgeUrl, limits) => this.judge(job, judgeUrl, limits));
  }

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

  async run(body: ExecutionRequest, userId: string | null = null) {
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

    const { response } = await this.gateway.execute({
      kind: 'run',
      userId,
      problemSlug: body.problemSlug,
      language,
      workspaceType: body.workspaceType ?? '',
      code: body.code,
      input: body.input ?? '',
    });

    /* ===================================================
       RETURN RESULT TO EDITOR
    =================================================== */

    return {
      problemSlug: body.problemSlug,

      language,

      workspaceType: body.workspaceType,

      context: body.context,

      ...(response as Record<string, unknown>),
    };
  }

  /* =======================================================
     SEND TO JUDGE
  ======================================================= */

  private async judge(job: JobPayload, judgeUrl: string, limits: JudgeLimits): Promise<{ response: unknown; record: RunRecord }> {
    const language = job.language;

    const gitTestCase =
      language === 'git' ? getGitTestCases(job.problemSlug)[0] : undefined;

    try {
      const response = await fetch(`${judgeUrl}/run`, {
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

          code: job.code,

          limits,

          ...(language === 'git'
            ? {
                setupScript: gitTestCase!.setupScript,

                verifyScript: gitTestCase!.verifyScript,
              }
            : {
                input: job.input ?? '',
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

      return {
        response: {
          status: result.status,

          output: result.output ?? '',

          stderr: result.stderr ?? '',

          exitCode: result.exitCode ?? null,

          message: result.message,
        },
        record: {
          outcome: OUTCOME[result.status] ?? 'sandbox',
          exitCode: result.exitCode ?? null,
          stdout: result.output ?? '',
          stderr: result.stderr ?? result.message ?? '',
        },
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