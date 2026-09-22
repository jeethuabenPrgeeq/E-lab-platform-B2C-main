import http from 'node:http';

import {
  execFile,
} from 'node:child_process';

import {
  mkdir,
  rm,
  writeFile,
} from 'node:fs/promises';

import os from 'node:os';

import path from 'node:path';

import crypto from 'node:crypto';

/* =========================================================
   CONFIG
========================================================= */

const PORT = 4100;

const C_IMAGE =
  'elab-judge-c:latest';

const CPP_IMAGE =
  'elab-judge-cpp:latest';

const JAVA_IMAGE =
  'elab-judge-java:latest';

const CSHARP_IMAGE =
  'elab-judge-csharp:latest';

const PYTHON_IMAGE =
  'elab-judge-python:latest';

const GO_IMAGE =
  'elab-judge-go:latest';

const RUBY_IMAGE =
  'elab-judge-ruby:latest';

const SWIFT_IMAGE =
  'elab-judge-swift:latest';

const GIT_IMAGE =
  'elab-judge-git:latest';

/* =========================================================
   LANGUAGE CONFIG
========================================================= */

const LANGUAGE_CONFIG = {
  c: {
    image:
      C_IMAGE,

    sourceFile:
      'main.c',

    compileCommand:
      'gcc /workspace/main.c -O2 -std=c17 -Wall -Wextra -o /tmp/main',

    runCommand:
      '/tmp/main',

    memory:
      '128m',

    tmpSize:
      '64m',

    timeoutSeconds:
      2,
  },

  cpp: {
    image:
      CPP_IMAGE,

    sourceFile:
      'main.cpp',

    compileCommand:
      'g++ /workspace/main.cpp -O2 -std=c++20 -Wall -Wextra -o /tmp/main',

    runCommand:
      '/tmp/main',

    memory:
      '128m',

    tmpSize:
      '64m',

    timeoutSeconds:
      2,
  },

  java: {
    image:
      JAVA_IMAGE,

    sourceFile:
      'Main.java',

    compileCommand:
      'javac -encoding UTF-8 -d /tmp /workspace/Main.java',

    runCommand:
      'java -Xms16m -Xmx64m -XX:MaxMetaspaceSize=64m -cp /tmp Main',

    memory:
      '256m',

    tmpSize:
      '128m',

    timeoutSeconds:
      6,
  },

  csharp: {
    image:
      CSHARP_IMAGE,

    sourceFile:
      'Program.cs',

    /*
     * A bare .cs file cannot compile
     * standalone (no .csproj), so we
     * copy the pre-restored template
     * project baked into the image,
     * drop the learner's file in as
     * Program.cs, then build with
     * --no-restore (no network needed
     * at runtime; NuGet was already
     * resolved when the image was built).
     */

    compileCommand:
      'cp -r /opt/csharp-template /tmp/csproj && cp /workspace/Program.cs /tmp/csproj/Program.cs && dotnet build /tmp/csproj -c Release -o /tmp/csproj/out --no-restore -v quiet',

    runCommand:
      'dotnet /tmp/csproj/out/App.dll',

    memory:
      '384m',

    tmpSize:
      '256m',

    timeoutSeconds:
      10,
  },

  python: {
    image:
      PYTHON_IMAGE,

    sourceFile:
      'main.py',

    /*
     * py_compile only checks syntax and
     * writes its output to /tmp (never
     * /workspace, which is read-only) —
     * it isn't needed to run the script,
     * just to classify syntax errors as
     * COMPILATION_ERROR instead of
     * RUNTIME_ERROR, same as the other
     * languages.
     */

    compileCommand:
      'python3 -c "import py_compile; py_compile.compile(\'/workspace/main.py\', cfile=\'/tmp/main.pyc\', doraise=True)"',

    runCommand:
      'python3 /workspace/main.py',

    memory:
      '128m',

    tmpSize:
      '64m',

    timeoutSeconds:
      3,
  },

  go: {
    image:
      GO_IMAGE,

    sourceFile:
      'main.go',

    compileCommand:
      'mkdir -p /tmp/go-cache && cp -r /opt/go-cache/. /tmp/go-cache/ && GOCACHE=/tmp/go-cache /usr/local/go/bin/go build -o /tmp/main /workspace/main.go',

    runCommand:
      '/tmp/main',

    memory:
      '128m',

    tmpSize:
      '128m',

    timeoutSeconds:
      8,
  },

  ruby: {
    image:
      RUBY_IMAGE,

    sourceFile:
      'main.rb',

    compileCommand:
      'ruby -c /workspace/main.rb',

    runCommand:
      'ruby /workspace/main.rb',

    memory:
      '128m',

    tmpSize:
      '64m',

    timeoutSeconds:
      5,
  },

  swift: {
    image:
      SWIFT_IMAGE,

    sourceFile:
      'main.swift',

    /*
     * -module-cache-path is set explicitly
     * because modern Clang (which swiftc
     * uses internally, even for pure Swift
     * code) defaults its module cache to
     * ~/.cache/clang/ModuleCache — and
     * $HOME is read-only at runtime.
     */

    compileCommand:
      'swiftc -module-cache-path /tmp/swift-module-cache -o /tmp/main /workspace/main.swift',

    runCommand:
      '/tmp/main',

    memory:
      '256m',

    tmpSize:
      '128m',

    timeoutSeconds:
      12,
  },
};

/* =========================================================
   RESPONSE HELPER
========================================================= */

function sendJson(
  response,
  statusCode,
  data,
) {
  response.writeHead(
    statusCode,
    {
      'Content-Type':
        'application/json',

      'Access-Control-Allow-Origin':
        '*',

      'Cache-Control':
        'no-store',
    },
  );

  response.end(
    JSON.stringify(
      data,
    ),
  );
}

/* =========================================================
   NORMALIZE LANGUAGE
========================================================= */

function normalizeLanguage(
  language,
) {
  const normalized =
    String(
      language ?? '',
    )
      .trim()
      .toLowerCase();

  /*
   * Allow frontend/API aliases.
   */

  if (
    normalized === 'c++' ||
    normalized === 'cplusplus'
  ) {
    return 'cpp';
  }

  return normalized;
}

/* =========================================================
   READ BODY
========================================================= */

async function readJsonBody(
  request,
) {
  return await new Promise(
    (
      resolve,
      reject,
    ) => {
      let body = '';

      request.on(
        'data',
        (chunk) => {
          body +=
            chunk.toString();

          /*
           * Development protection
           * against very large requests.
           */

          if (
            body.length >
            1_000_000
          ) {
            reject(
              new Error(
                'Request too large.',
              ),
            );

            request.destroy();
          }
        },
      );

      request.on(
        'end',
        () => {
          try {
            resolve(
              body
                ? JSON.parse(
                    body,
                  )
                : {},
            );
          } catch {
            reject(
              new Error(
                'Invalid JSON.',
              ),
            );
          }
        },
      );

      request.on(
        'error',
        reject,
      );
    },
  );
}

/* =========================================================
   EXECUTE DOCKER
========================================================= */

function runDocker(
  args,
) {
  return new Promise(
    (
      resolve,
    ) => {
      execFile(
        'docker',
        args,
        {
          windowsHide:
            true,

          /*
           * Overall Docker
           * command timeout.
           */

          timeout:
            15_000,

          /*
           * Prevent unlimited output.
           */

          maxBuffer:
            1024 *
            1024,
        },

        (
          error,
          stdout,
          stderr,
        ) => {
          resolve({
            error,

            stdout:
              stdout ?? '',

            stderr:
              stderr ?? '',
          });
        },
      );
    },
  );
}

/* =========================================================
   EXECUTE COMPILED LANGUAGE

   Used by:
   - C
   - C++

   Same execution flow.
========================================================= */

async function executeCompiledCode({
  language,
  code,
  input = '',
}) {
  const config =
    LANGUAGE_CONFIG[
      language
    ];

  if (!config) {
    return {
      status:
        'UNSUPPORTED_LANGUAGE',

      message:
        `Unsupported language: ${language}`,
    };
  }

  /* =======================================================
     CREATE UNIQUE EXECUTION DIRECTORY
  ======================================================= */

  const executionId =
    crypto.randomUUID();

  const workDirectory =
    path.join(
      os.tmpdir(),
      `elab-${executionId}`,
    );

  await mkdir(
    workDirectory,
    {
      recursive:
        true,
    },
  );

  /* =======================================================
     SOURCE FILE
  ======================================================= */

  const sourcePath =
    path.join(
      workDirectory,
      config.sourceFile,
    );

  /* =======================================================
     INPUT FILE
  ======================================================= */

  const inputPath =
    path.join(
      workDirectory,
      'input.txt',
    );

  try {
    /* =====================================================
       WRITE LEARNER CODE
    ===================================================== */

    await writeFile(
      sourcePath,
      code,
      'utf8',
    );

    /* =====================================================
       WRITE STDIN
    ===================================================== */

    await writeFile(
      inputPath,
      input,
      'utf8',
    );

    /*
     * Learner code is NOT inserted
     * into the shell command.
     *
     * It is only stored inside:
     *
     * main.c
     * OR
     * main.cpp
     */

    /* =====================================================
       COMPILE + RUN COMMAND
    ===================================================== */

    const chmodCommand =
      language === 'java' ||
      language === 'csharp' ||
      language === 'python' ||
      language === 'ruby'
        ? ''
        : 'chmod 700 /tmp/main';

      const shellCommand = `
        set +e

        export GIT_CONFIG_GLOBAL=/tmp/.gitconfig

        git config --global user.email "learner@elab.dev"
        git config --global user.name "Learner"
        git config --global init.defaultBranch main

        mkdir -p /tmp/repo
        cd /tmp/repo

        {
        ${setupScript}
        } > /tmp/setup-output.txt 2>&1

        cd /tmp/repo

        bash /workspace/learner.sh > /tmp/learner-output.txt 2>&1

        cd /tmp/repo

        ${verifyScript}

        exit 0`.trim();

    /* =====================================================
       DOCKER ARGUMENTS
    ===================================================== */

    const dockerArgs = [
      'run',

      '--rm',

      /* -----------------------------------------------
         NO NETWORK
      ----------------------------------------------- */

      '--network',
      'none',

      /* -----------------------------------------------
         MEMORY
      ----------------------------------------------- */

      '--memory',
      config.memory,

      '--memory-swap',
      config.memory,

      /* -----------------------------------------------
         CPU
      ----------------------------------------------- */

      '--cpus',
      '0.5',

      /* -----------------------------------------------
         PROCESS LIMIT
      ----------------------------------------------- */

      '--pids-limit',
      '64',

      /* -----------------------------------------------
         DROP PRIVILEGES
      ----------------------------------------------- */

      '--cap-drop',
      'ALL',

      '--security-opt',
      'no-new-privileges',

      /* -----------------------------------------------
         READ-ONLY CONTAINER
      ----------------------------------------------- */

      '--read-only',

      /* -----------------------------------------------
         EXECUTABLE TEMP AREA
      ----------------------------------------------- */

      '--tmpfs',
      `/tmp:rw,exec,nosuid,nodev,size=${config.tmpSize}`,

      /* -----------------------------------------------
         READ-ONLY LEARNER FILES
      ----------------------------------------------- */

      '--mount',
      `type=bind,source=${workDirectory},target=/workspace,readonly`,

      /* -----------------------------------------------
         LANGUAGE IMAGE
      ----------------------------------------------- */

      config.image,

      /* -----------------------------------------------
         RUN COMMAND
      ----------------------------------------------- */

      'sh',

      '-lc',

      shellCommand,
    ];

    /* =====================================================
       RUN CONTAINER
    ===================================================== */

    const result =
      await runDocker(
        dockerArgs,
      );

    /* =====================================================
       SUCCESS
    ===================================================== */

    if (
      !result.error
    ) {
      return {
        status:
          'SUCCESS',

        output:
          result.stdout,

        stderr:
          result.stderr,

        exitCode:
          0,
      };
    }

    /* =====================================================
       EXIT CODE
    ===================================================== */

    const exitCode =
      typeof result.error
        .code ===
        'number'
        ? result.error.code
        : null;

    /* =====================================================
       COMPILATION ERROR

       We manually exit 100
       when gcc/g++ fails.
    ===================================================== */

    if (
      exitCode ===
      100
    ) {
      return {
        status:
          'COMPILATION_ERROR',

        output:
          result.stdout ||
          result.stderr,

        stderr:
          result.stderr,

        exitCode,
      };
    }

    /* =====================================================
       PROGRAM TIMEOUT

       GNU timeout returns 124.
    ===================================================== */

    if (
      exitCode ===
      124
    ) {
      return {
        status:
          'TIME_LIMIT_EXCEEDED',

        output:
          'Time Limit Exceeded',

        stderr:
          result.stderr,

        exitCode,
      };
    }

    /* =====================================================
       HOST-SIDE DOCKER TIMEOUT
    ===================================================== */

    if (
      result.error
        ?.killed
    ) {
      return {
        status:
          'TIME_LIMIT_EXCEEDED',

        output:
          'Time Limit Exceeded',

        stderr:
          result.stderr,

        exitCode,
      };
    }

    /* =====================================================
       RUNTIME ERROR
    ===================================================== */

    return {
      status:
        'RUNTIME_ERROR',

      output:
        result.stdout ||
        result.stderr ||
        'Program exited with an error.',

      stderr:
        result.stderr,

      exitCode,
    };
  } finally {
    /* =====================================================
       ALWAYS DELETE LEARNER FILES
    ===================================================== */

    await rm(
      workDirectory,
      {
        recursive:
          true,

        force:
          true,
      },
    );
  }
}

/* =========================================================
   EXECUTE GIT TASK

   Not a LANGUAGE_CONFIG language: git has no
   compile step, and the setup/verify scripts
   are per-PROBLEM, not per-language, so they
   arrive in the request body instead of coming
   from a fixed config entry.

   Flow:
   1. Init a scratch repo and configure identity
      LOCALLY (never --global — that would try
      to write ~/.gitconfig, which is read-only).
   2. Run the trusted setupScript to prepare the
      starting repo state.
   3. Run the learner's commands. Their exit code
      is ignored — a failed git command is not a
      COMPILATION_ERROR here, since the resulting
      repo state is what's actually being judged.
   4. Run the trusted verifyScript, which inspects
      the repo and prints a deterministic result.
      That printed text is what gets diffed against
      expectedOutput, exactly like every other
      language's stdout — so verifyScript always
      exits 0 regardless of what it finds.
========================================================= */

const GIT_TIMEOUT_SECONDS = 20;

const GIT_MEMORY = '128m';

const GIT_TMP_SIZE = '64m';

async function executeGitTask({
  code,
  setupScript,
  verifyScript,
}) {
  const executionId =
    crypto.randomUUID();

  const workDirectory =
    path.join(
      os.tmpdir(),
      `elab-git-${executionId}`,
    );

  await mkdir(
    workDirectory,
    {
      recursive:
        true,
    },
  );

  const sourcePath =
    path.join(
      workDirectory,
      'learner.sh',
    );

  try {
    await writeFile(
      sourcePath,
      code,
      'utf8',
    );

    const shellCommand = `
set +e

mkdir -p /tmp/repo
cd /tmp/repo

git init -q
git config user.email "learner@elab.dev"
git config user.name "Learner"

{
${setupScript}
} > /tmp/setup-output.txt 2>&1

bash /workspace/learner.sh > /tmp/learner-output.txt 2>&1

cd /tmp/repo

${verifyScript}

exit 0
    `.trim();

    const dockerArgs = [
      'run',

      '--rm',

      '--network',
      'none',

      '--memory',
      GIT_MEMORY,

      '--memory-swap',
      GIT_MEMORY,

      '--cpus',
      '0.5',

      '--pids-limit',
      '64',

      '--cap-drop',
      'ALL',

      '--security-opt',
      'no-new-privileges',

      '--read-only',

      '--tmpfs',
      `/tmp:rw,exec,nosuid,nodev,size=${GIT_TMP_SIZE}`,

      '--mount',
      `type=bind,source=${workDirectory},target=/workspace,readonly`,

      GIT_IMAGE,

      /*
       * timeout wraps sh directly at the
       * argv level, not embedded inside the
       * shell string — no quoting concerns
       * even though setupScript/verifyScript
       * may themselves contain quotes.
       */

      'timeout',

      `${GIT_TIMEOUT_SECONDS}s`,

      'sh',

      '-lc',

      shellCommand,
    ];

    const result =
      await runDocker(
        dockerArgs,
      );

    if (
      !result.error
    ) {
      return {
        status:
          'SUCCESS',

        output:
          result.stdout,

        stderr:
          result.stderr,

        exitCode:
          0,
      };
    }

    const exitCode =
      typeof result.error
        .code ===
        'number'
        ? result.error.code
        : null;

    if (
      exitCode ===
        124 ||
      result.error
        ?.killed
    ) {
      return {
        status:
          'TIME_LIMIT_EXCEEDED',

        output:
          'Time Limit Exceeded',

        stderr:
          result.stderr,

        exitCode,
      };
    }

    return {
      status:
        'RUNTIME_ERROR',

      output:
        result.stdout ||
        result.stderr ||
        'Git task exited with an error.',

      stderr:
        result.stderr,

      exitCode,
    };
  } finally {
    await rm(
      workDirectory,
      {
        recursive:
          true,

        force:
          true,
      },
    );
  }
}

/* =========================================================
   HTTP SERVER
========================================================= */

const server =
  http.createServer(
    async (
      request,
      response,
    ) => {
      /* ===================================================
         CORS PREFLIGHT
      =================================================== */

      if (
        request.method ===
        'OPTIONS'
      ) {
        response.writeHead(
          204,
          {
            'Access-Control-Allow-Origin':
              '*',

            'Access-Control-Allow-Methods':
              'GET, POST, OPTIONS',

            'Access-Control-Allow-Headers':
              'Content-Type',
          },
        );

        response.end();

        return;
      }

      /* ===================================================
         HEALTH CHECK
      =================================================== */

      if (
        request.method ===
          'GET' &&
        request.url ===
          '/health'
      ) {
        sendJson(
          response,
          200,
          {
            status:
              'ok',

            service:
              'elab-judge',

            supportedLanguages: [
              'c',
              'cpp',
              'java',
              'csharp',
              'python',
              'go',
              'ruby',
              'swift',
              'git',
            ],
          },
        );

        return;
      }

      /* ===================================================
         EXECUTE CODE
      =================================================== */

      if (
        request.method ===
          'POST' &&
        request.url ===
          '/run'
      ) {
        try {
          const body =
            await readJsonBody(
              request,
            );

          /* ===============================================
             LANGUAGE
          =============================================== */

          const language =
            normalizeLanguage(
              body.language,
            );

          /* ===============================================
             CHECK CODE

             Needed by every language, including
             git, so this check moves above the
             LANGUAGE_CONFIG branch below.
          =============================================== */

          if (
            !body.code ||
            typeof body.code !==
              'string'
          ) {
            sendJson(
              response,
              400,
              {
                status:
                  'INVALID_REQUEST',

                message:
                  'Code is required.',
              },
            );

            return;
          }

          /* ===============================================
             GIT

             Not a LANGUAGE_CONFIG language —
             setup/verify scripts are per-problem
             and arrive in the request body itself.
          =============================================== */

          if (
            language === 'git'
          ) {
            const gitResult =
              await executeGitTask({
                code:
                  body.code,

                setupScript:
                  typeof body.setupScript ===
                  'string'
                    ? body.setupScript
                    : '',

                verifyScript:
                  typeof body.verifyScript ===
                  'string'
                    ? body.verifyScript
                    : '',
              });

            sendJson(
              response,
              200,
              {
                language,

                ...gitResult,
              },
            );

            return;
          }

          /* ===============================================
             CHECK LANGUAGE
          =============================================== */

          if (
            !LANGUAGE_CONFIG[
              language
            ]
          ) {
            sendJson(
              response,
              400,
              {
                status:
                  'UNSUPPORTED_LANGUAGE',

                message:
                  `Supported languages are C, C++, Java, C#, Python, Go, Ruby, Swift and Git. Received: ${language || 'none'}.`,
              },
            );

            return;
          }

          /* ===============================================
             RUN COMPILED / INTERPRETED LANGUAGE
          =============================================== */

          const result =
            await executeCompiledCode({
              language,

              code:
                body.code,

              input:
                typeof body.input ===
                'string'
                  ? body.input
                  : '',
            });

          /* ===============================================
             RESPONSE
          =============================================== */

          sendJson(
            response,
            200,
            {
              language,

              ...result,
            },
          );
        } catch (
          error
        ) {
          console.error(
            'Judge error:',
            error,
          );

          sendJson(
            response,
            500,
            {
              status:
                'INTERNAL_ERROR',

              message:
                error instanceof
                Error
                  ? error.message
                  : 'Judge failed.',
            },
          );
        }

        return;
      }

      /* ===================================================
         NOT FOUND
      =================================================== */

      sendJson(
        response,
        404,
        {
          status:
            'NOT_FOUND',

          message:
            'Not found.',
        },
      );
    },
  );

/* =========================================================
   START
========================================================= */

server.listen(
  PORT,
  '127.0.0.1',
  () => {
    console.log(
      `eLab Judge running at http://127.0.0.1:${PORT}`,
    );

    console.log(
      'Supported languages: C, C++, Java, C#, Python, Go, Ruby, Swift, Git',
    );

    console.log(
      `C image: ${C_IMAGE}`,
    );

    console.log(
      `C++ image: ${CPP_IMAGE}`,
    );

    console.log(
      `Java image: ${JAVA_IMAGE}`,
    );

    console.log(
      `C# image: ${CSHARP_IMAGE}`,
    );

    console.log(
      `Python image: ${PYTHON_IMAGE}`,
    );

    console.log(
      `Go image: ${GO_IMAGE}`,
    );

    console.log(
      `Ruby image: ${RUBY_IMAGE}`,
    );

    console.log(
      `Swift image: ${SWIFT_IMAGE}`,
    );

    console.log(
      `Git image: ${GIT_IMAGE}`,
    );
  },
);