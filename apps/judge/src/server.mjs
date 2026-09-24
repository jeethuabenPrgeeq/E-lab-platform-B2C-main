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

import { WebSocketServer, } from 'ws';

import * as pty from '@homebridge/node-pty-prebuilt-multiarch';

/* =========================================================
   CRASH SAFETY NET

   node-pty on Windows can throw from inside its own
   internals (windowsPtyAgent.js) when a PTY's ConPTY
   agent is queried after the process it wraps has
   already torn down — a known race in
   @homebridge/node-pty-prebuilt-multiarch, not our code.

   Without this handler, that single uncaught exception
   kills the ENTIRE judge process — every language, every
   learner's session — until someone notices and manually
   restarts it (node --watch does not restart on crash,
   only on a file change). Logging and staying alive is
   far better than one bad PTY teardown taking down every
   in-flight session.
========================================================= */

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception (judge stays alive):', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (judge stays alive):', reason);
});

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
  timeoutMs = 15_000,
) {
  return new Promise(
    (resolve) => {
      execFile(
        'docker',
        args,
        {
          windowsHide: true,
          timeout: timeoutMs,
          maxBuffer: 1024 * 1024,
        },
        (error, stdout, stderr) => {
          resolve({
            error,
            stdout: stdout ?? '',
            stderr: stderr ?? '',
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
            ${config.compileCommand} > /tmp/compile-output.txt 2>&1

            COMPILE_STATUS=$?

            if [ "$COMPILE_STATUS" -ne 0 ]; then
              cat /tmp/compile-output.txt
              exit 100
            fi

            ${chmodCommand}

            timeout ${config.timeoutSeconds}s ${config.runCommand} < /workspace/input.txt
          `.trim();

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
        (config.timeoutSeconds + 15) * 1000,
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

    if (result.error?.killed) {
      return {
        status: 'INFRASTRUCTURE_ERROR',
        output: 'The execution environment took too long to respond. Please try again.',
        stderr: result.stderr,
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

const GIT_TIMEOUT_SECONDS = 20;

const GIT_MEMORY = '128m';

const GIT_TMP_SIZE = '64m';

const LINUX_IMAGE = 'elab-judge-linux:latest';

const LINUX_TIMEOUT_SECONDS = 15;

const LINUX_MEMORY = '128m';

const LINUX_TMP_SIZE = '64m';

const DOCKER_IMAGE = LINUX_IMAGE;

const DOCKER_TIMEOUT_SECONDS = 15;

const DOCKER_MEMORY = '128m';

const DOCKER_TMP_SIZE = '64m';

const KUBERNETES_IMAGE = LINUX_IMAGE;
const KUBERNETES_TIMEOUT_SECONDS = 15;
const KUBERNETES_MEMORY = '128m';
const KUBERNETES_TMP_SIZE = '64m';

const CICD_IMAGE = LINUX_IMAGE;
const CICD_TIMEOUT_SECONDS = 15;
const CICD_MEMORY = '128m';
const CICD_TMP_SIZE = '64m';

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
        (GIT_TIMEOUT_SECONDS + 15) * 1000,
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

    if (exitCode === 124) {
  return {
    status: 'TIME_LIMIT_EXCEEDED',
    output: 'Time Limit Exceeded',
    stderr: result.stderr,
    exitCode,
  };
}

if (result.error?.killed) {
  return {
    status: 'INFRASTRUCTURE_ERROR',
    output: 'The execution environment took too long to respond. Please try again.',
    stderr: result.stderr,
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

async function executeLinuxTask({
  code,
  setupScript,
  verifyScript,
}) {
  const executionId =
    crypto.randomUUID();

  const workDirectory =
    path.join(
      os.tmpdir(),
      `elab-linux-${executionId}`,
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

      mkdir -p /tmp/task
      cd /tmp/task

      {
      ${setupScript}
      } > /tmp/setup-output.txt 2>&1

      cd /tmp/task

      bash /workspace/learner.sh > /tmp/learner-output.txt 2>&1

      cd /tmp/task

      ${verifyScript}

      exit 0
    `.trim();

    const dockerArgs = [
      'run',

      '--rm',

      '--network',
      'none',

      '--memory',
      LINUX_MEMORY,

      '--memory-swap',
      LINUX_MEMORY,

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
      `/tmp:rw,exec,nosuid,nodev,size=${LINUX_TMP_SIZE}`,

      '--mount',
      `type=bind,source=${workDirectory},target=/workspace,readonly`,

      LINUX_IMAGE,

      'timeout',

      `${LINUX_TIMEOUT_SECONDS}s`,

      'sh',

      '-lc',

      shellCommand,
    ];

    const result =
  await runDocker(
    dockerArgs,
    (LINUX_TIMEOUT_SECONDS + 15) * 1000,
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

    if (exitCode === 124) {
      return {
        status: 'TIME_LIMIT_EXCEEDED',
        output: 'Time Limit Exceeded',
        stderr: result.stderr,
        exitCode,
      };
    }

    if (result.error?.killed) {
      return {
        status: 'INFRASTRUCTURE_ERROR',
        output: 'The execution environment took too long to respond. Please try again.',
        stderr: result.stderr,
        exitCode,
      };
    }

    return {
      status:
        'RUNTIME_ERROR',

      output:
        result.stdout ||
        result.stderr ||
        'Linux task exited with an error.',

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
              'linux',
              'docker',
              'kubernetes',
              'cicd',
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
             LINUX
          =============================================== */

          if (
            language === 'linux'
          ) {
            const linuxResult =
              await executeLinuxTask({
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

                ...linuxResult,
              },
            );

            return;
          }

          if (
            language === 'docker'
          ) {
            const dockerResult =
              await executeLinuxTask({
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

                ...dockerResult,
              },
            );

            return;
          }

                    if (language === 'kubernetes') {
            const kubernetesResult = await executeLinuxTask({
              code: body.code,
              setupScript: typeof body.setupScript === 'string' ? body.setupScript : '',
              verifyScript: typeof body.verifyScript === 'string' ? body.verifyScript : '',
            });

            sendJson(response, 200, { language, ...kubernetesResult });
            return;
          }

          if (language === 'cicd') {
            const cicdResult = await executeLinuxTask({
              code: body.code,
              setupScript: typeof body.setupScript === 'string' ? body.setupScript : '',
              verifyScript: typeof body.verifyScript === 'string' ? body.verifyScript : '',
            });

            sendJson(response, 200, { language, ...cicdResult });
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
         VERIFY LIVE SESSION (PHASE 3)
      =================================================== */

      if (
        request.method ===
          'POST' &&
        request.url ===
          '/verify-session'
      ) {
        try {
          const body =
            await readJsonBody(
              request,
            );

          const {
            containerName,
            verifyScript,
          } = body;

          if (
            !containerName ||
            typeof containerName !==
              'string'
          ) {
            sendJson(
              response,
              400,
              {
                status:
                  'INVALID_REQUEST',

                message:
                  'containerName is required.',
              },
            );

            return;
          }

          const verifyShellCommand =
            `cd /tmp/repo\n${verifyScript ?? ''}`.trim();

          const result =
            await runDocker([
              'exec',

              containerName,

              'sh',

              '-lc',

              verifyShellCommand,
            ]);

          if (
            !result.error
          ) {
            sendJson(
              response,
              200,
              {
                status:
                  'SUCCESS',

                output:
                  result.stdout,

                stderr:
                  result.stderr,
              },
            );

            return;
          }

          sendJson(
            response,
            200,
            {
              status:
                'RUNTIME_ERROR',

              output:
                result.stdout ||
                result.stderr ||
                'Verify failed.',

              stderr:
                result.stderr,
            },
          );
        } catch (
          error
        ) {
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
         VERIFY LIVE SESSION — LINUX
      =================================================== */

      if (
        request.method ===
          'POST' &&
        request.url ===
          '/verify-session-linux'
      ) {
        try {
          const body =
            await readJsonBody(
              request,
            );

          const {
            containerName,
            verifyScript,
          } = body;

          if (
            !containerName ||
            typeof containerName !==
              'string'
          ) {
            sendJson(
              response,
              400,
              {
                status:
                  'INVALID_REQUEST',

                message:
                  'containerName is required.',
              },
            );

            return;
          }

          const verifyShellCommand =
            `cd /tmp/task\n${verifyScript ?? ''}`.trim();

          const result =
            await runDocker([
              'exec',

              containerName,

              'sh',

              '-lc',

              verifyShellCommand,
            ]);

          if (
            !result.error
          ) {
            sendJson(
              response,
              200,
              {
                status:
                  'SUCCESS',

                output:
                  result.stdout,

                stderr:
                  result.stderr,
              },
            );

            return;
          }

          sendJson(
            response,
            200,
            {
              status:
                'RUNTIME_ERROR',

              output:
                result.stdout ||
                result.stderr ||
                'Verify failed.',

              stderr:
                result.stderr,
            },
          );
        } catch (
          error
        ) {
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

      if (
  request.method ===
    'POST' &&
  request.url ===
    '/verify-session-docker'
) {
  try {
    const body =
      await readJsonBody(
        request,
      );

    const {
      containerName,
      verifyScript,
    } = body;

    if (
      !containerName ||
      typeof containerName !==
        'string'
    ) {
      sendJson(
        response,
        400,
        {
          status:
            'INVALID_REQUEST',

          message:
            'containerName is required.',
        },
      );

      return;
    }

    const verifyShellCommand =
      `cd /tmp/task\n${verifyScript ?? ''}`.trim();

    const result =
      await runDocker([
        'exec',

        containerName,

        'sh',

        '-lc',

        verifyShellCommand,
      ]);

    if (
      !result.error
    ) {
      sendJson(
        response,
        200,
        {
          status:
            'SUCCESS',

          output:
            result.stdout,

          stderr:
            result.stderr,
        },
      );

      return;
    }

    sendJson(
      response,
      200,
      {
        status:
          'RUNTIME_ERROR',

        output:
          result.stdout ||
          result.stderr ||
          'Verify failed.',

        stderr:
          result.stderr,
      },
    );
  } catch (
    error
  ) {
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

      if (
        request.method === 'POST' &&
        request.url === '/verify-session-kubernetes'
      ) {
        try {
          const body = await readJsonBody(request);
          const { containerName, verifyScript } = body;

          if (!containerName || typeof containerName !== 'string') {
            sendJson(response, 400, {
              status: 'INVALID_REQUEST',
              message: 'containerName is required.',
            });
            return;
          }

          const verifyShellCommand = `cd /tmp/task\n${verifyScript ?? ''}`.trim();

          const result = await runDocker([
            'exec',
            containerName,
            'sh',
            '-lc',
            verifyShellCommand,
          ]);

          if (!result.error) {
            sendJson(response, 200, {
              status: 'SUCCESS',
              output: result.stdout,
              stderr: result.stderr,
            });
            return;
          }

          sendJson(response, 200, {
            status: 'RUNTIME_ERROR',
            output: result.stdout || result.stderr || 'Verify failed.',
            stderr: result.stderr,
          });
        } catch (error) {
          sendJson(response, 500, {
            status: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Judge failed.',
          });
        }
        return;
      }

      if (
        request.method === 'POST' &&
        request.url === '/verify-session-cicd'
      ) {
        try {
          const body = await readJsonBody(request);
          const { containerName, verifyScript } = body;

          if (!containerName || typeof containerName !== 'string') {
            sendJson(response, 400, {
              status: 'INVALID_REQUEST',
              message: 'containerName is required.',
            });
            return;
          }

          const verifyShellCommand = `cd /tmp/task\n${verifyScript ?? ''}`.trim();

          const result = await runDocker([
            'exec',
            containerName,
            'sh',
            '-lc',
            verifyShellCommand,
          ]);

          if (!result.error) {
            sendJson(response, 200, {
              status: 'SUCCESS',
              output: result.stdout,
              stderr: result.stderr,
            });
            return;
          }

          sendJson(response, 200, {
            status: 'RUNTIME_ERROR',
            output: result.stdout || result.stderr || 'Verify failed.',
            stderr: result.stderr,
          });
        } catch (error) {
          sendJson(response, 500, {
            status: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Judge failed.',
          });
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
   LIVE TERMINAL (PHASE 1 — PROOF OF MECHANISM)

   Not tied to any problem yet. Confirms the actual
   plumbing works: a persistent (non --rm-on-exit)
   container, docker exec -it spawned as a child
   process, and its stdin/stdout piped directly to
   and from a WebSocket. Session lifecycle, setup
   scripts, and grading come in later phases.
========================================================= */

const wss = new WebSocketServer({
  noServer: true,
});

server.on(
  'upgrade',
  (request, socket, head) => {
    const url = new URL(
      request.url,
      'http://localhost',
    );

       if (
      url.pathname.startsWith(
        '/terminal/',
      )
    ) {
      wss.handleUpgrade(
        request,
        socket,
        head,
        (ws) => {
          wss.emit(
            'connection',
            ws,
            request,
          );
        },
      );
        } else if (
      url.pathname.startsWith(
        '/terminal-linux/',
      )
    ) {
      wssLinux.handleUpgrade(
        request,
        socket,
        head,
        (ws) => {
          wssLinux.emit(
            'connection',
            ws,
            request,
          );
        },
      );
    } else if (
      url.pathname.startsWith(
        '/terminal-docker/',
      )
    ) {
      wssDocker.handleUpgrade(
        request,
        socket,
        head,
        (ws) => {
          wssDocker.emit(
            'connection',
            ws,
            request,
          );
        },
      );
        } else if (
      url.pathname.startsWith(
        '/terminal-kubernetes/',
      )
    ) {
      wssKubernetes.handleUpgrade(
        request,
        socket,
        head,
        (ws) => {
          wssKubernetes.emit(
            'connection',
            ws,
            request,
          );
        },
      );
    } else if (
      url.pathname.startsWith(
        '/terminal-cicd/',
      )
    ) {
      wssCicd.handleUpgrade(
        request,
        socket,
        head,
        (ws) => {
          wssCicd.emit(
            'connection',
            ws,
            request,
          );
        },
      );
    } else {
      socket.destroy();
    }
  },
);

wss.on(
  'connection',
  async (ws, request) => {
    const url = new URL(
      request.url,
      'http://localhost',
    );

    const problemSlug =
      url.pathname.replace(
        '/terminal/',
        '',
      );

    const encodedSetup =
      url.searchParams.get(
        'setupScript',
      ) ?? '';

    const setupScript =
      encodedSetup
        ? Buffer.from(
            encodedSetup,
            'base64',
          ).toString(
            'utf8',
          )
        : '';

    const containerName =
      `elab-term-${crypto.randomUUID()}`;

    ws.send(
      'Starting session...\r\n',
    );

    const startResult =
      await runDocker([
        'run',

        '-d',

        '--rm',

        '--name',
        containerName,

        '--network',
        'none',

        '--memory',
        '128m',

        '--memory-swap',
        '128m',

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
        '/tmp:rw,exec,nosuid,nodev,size=64m',

        '-e',

        'GIT_CONFIG_GLOBAL=/tmp/.gitconfig',

        GIT_IMAGE,

        'sleep',

        'infinity',
      ], 30_000,);

    if (
      startResult.error
    ) {
      console.error(
        'Failed to start terminal session:',
        startResult.error,
      );

      ws.send(
        'Failed to start session.\r\n',
      );

      ws.send(
        `${startResult.stderr || startResult.error.message}\r\n`,
      );

      ws.close();

      return;
    }

    ws.send(
      'Preparing repository...\r\n',
    );

    const setupShellCommand =
        `
      mkdir -p /tmp/repo
      cd /tmp/repo

      export GIT_CONFIG_GLOBAL=/tmp/.gitconfig
      git config --global user.email "learner@elab.dev"
      git config --global user.name "Learner"
      git config --global init.defaultBranch main

      {
      ${setupScript}
      } > /tmp/setup-output.txt 2>&1
    `.trim();

    const setupResult =
      await runDocker([
        'exec',

        containerName,

        'sh',

        '-lc',

        setupShellCommand,
      ]);

    if (
      setupResult.error
    ) {
      ws.send(
        'Failed to prepare repository.\r\n',
      );

      ws.send(
        `${setupResult.stderr || setupResult.error.message}\r\n`,
      );
    }

    ws.send(
      `__ELAB_CONTROL__:${JSON.stringify(
        {
          containerName,
        },
      )}`,
    );

    const shell = pty.spawn(
      'docker',

      [
        'exec',

        '-it',

        '-w',

        '/tmp/repo',

        '-e',

        'GIT_CONFIG_GLOBAL=/tmp/.gitconfig',

        containerName,

        'bash',
      ],

      {
        name:
          'xterm-color',

        cols:
          80,

        rows:
          30,
      },
    );

    shell.onData(
      (data) => {
        ws.send(
          data,
        );
      },
    );

    ws.on(
      'message',
      (data) => {
        shell.write(
          data.toString(),
        );
      },
    );

    const cleanup =
      () => {
        shell.kill();

        execFile(
          'docker',
          [
            'kill',
            containerName,
          ],
          () => {},
        );
      };

    ws.on(
      'close',
      cleanup,
    );

    shell.onExit(
      () => {
        ws.close();
      },
    );
  },
);
  /* =========================================================
   LIVE TERMINAL — LINUX
========================================================= */

const wssLinux = new WebSocketServer({
  noServer: true,
});

wssLinux.on(
  'connection',
  async (ws, request) => {
    const url = new URL(
      request.url,
      'http://localhost',
    );

    const problemSlug =
      url.pathname.replace(
        '/terminal-linux/',
        '',
      );

    const encodedSetup =
      url.searchParams.get(
        'setupScript',
      ) ?? '';

    const setupScript =
      encodedSetup
        ? Buffer.from(
            encodedSetup,
            'base64',
          ).toString(
            'utf8',
          )
        : '';

    const containerName =
      `elab-term-linux-${crypto.randomUUID()}`;

    ws.send(
      'Starting session...\r\n',
    );

    const startResult =
      await runDocker([
        'run',

        '-d',

        '--rm',

        '--name',
        containerName,

        '--network',
        'none',

        '--memory',
        '128m',

        '--memory-swap',
        '128m',

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
        '/tmp:rw,exec,nosuid,nodev,size=64m',

        LINUX_IMAGE,

        'sleep',

        'infinity',
      ], 30_000, );

    if (
      startResult.error
    ) {
      console.error(
        'Failed to start Linux terminal session:',
        startResult.error,
      );

      ws.send(
        'Failed to start session.\r\n',
      );

      ws.send(
        `${startResult.stderr || startResult.error.message}\r\n`,
      );

      ws.close();

      return;
    }

    ws.send(
      'Preparing environment...\r\n',
    );

    const setupShellCommand =
  `
mkdir -p /tmp/task
cd /tmp/task

{
${setupScript}
} > /tmp/setup-output.txt 2>&1
    `.trim();

    const setupResult =
      await runDocker([
        'exec',

        containerName,

        'sh',

        '-lc',

        setupShellCommand,
      ]);

    if (
      setupResult.error
    ) {
      ws.send(
        'Failed to prepare environment.\r\n',
      );

      ws.send(
        `${setupResult.stderr || setupResult.error.message}\r\n`,
      );
    }

    ws.send(
      `__ELAB_CONTROL__:${JSON.stringify(
        {
          containerName,
        },
      )}`,
    );

    const shell = pty.spawn(
      'docker',

      [
        'exec',

        '-it',

        '-w',

        '/tmp/task',

        containerName,

        'bash',
      ],

      {
        name:
          'xterm-color',

        cols:
          80,

        rows:
          30,
      },
    );

    shell.onData(
      (data) => {
        ws.send(
          data,
        );
      },
    );

    ws.on(
      'message',
      (data) => {
        shell.write(
          data.toString(),
        );
      },
    );

    const cleanup =
      () => {
        shell.kill();

        execFile(
          'docker',
          [
            'kill',
            containerName,
          ],
          () => {},
        );
      };

    ws.on(
      'close',
      cleanup,
    );

    shell.onExit(
      () => {
        ws.close();
      },
    );
  },
);

const wssDocker = new WebSocketServer({
  noServer: true,
});

wssDocker.on(
  'connection',
  async (ws, request) => {
    const containerName =
      `elab-term-docker-${crypto.randomUUID()}`;

    const url = new URL(
      request.url,
      'http://localhost',
    );

    const encodedSetup =
      url.searchParams.get(
        'setupScript',
      ) ?? '';

    const setupScript =
      encodedSetup
        ? Buffer.from(
            encodedSetup,
            'base64',
          ).toString(
            'utf8',
          )
        : '';

    ws.send(
      'Starting session...\r\n',
    );

    const startResult =
      await runDocker([
        'run',

        '-d',

        '--rm',

        '--name',
        containerName,

        '--network',
        'none',

        '--memory',
        '128m',

        '--memory-swap',
        '128m',

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
        '/tmp:rw,exec,nosuid,nodev,size=64m',

        DOCKER_IMAGE,

        'sleep',

        'infinity',
      ], 30_000, );

    if (
      startResult.error
    ) {
      console.error(
        'Failed to start Docker terminal session:',
        startResult.error,
      );

      ws.send(
        'Failed to start session.\r\n',
      );

      ws.send(
        `${startResult.stderr || startResult.error.message}\r\n`,
      );

      ws.close();

      return;
    }

    ws.send(
      'Preparing environment...\r\n',
    );

    const setupShellCommand =
          `
        mkdir -p /tmp/task
        cd /tmp/task

        {
        :
        ${setupScript}
        } > /tmp/setup-output.txt 2>&1
          `.trim();

    const setupResult =
      await runDocker([
        'exec',

        containerName,

        'sh',

        '-lc',

        setupShellCommand,
      ]);

    if (
      setupResult.error
    ) {
      ws.send(
        'Failed to prepare environment.\r\n',
      );

      ws.send(
        `${setupResult.stderr || setupResult.error.message}\r\n`,
      );
    }

    ws.send(
      `__ELAB_CONTROL__:${JSON.stringify(
        {
          containerName,
        },
      )}`,
    );

    const shell = pty.spawn(
      'docker',

      [
        'exec',

        '-it',

        '-w',

        '/tmp/task',

        containerName,

        'bash',
      ],

      {
        name:
          'xterm-color',

        cols:
          80,

        rows:
          30,
      },
    );

    shell.onData(
      (data) => {
        ws.send(
          data,
        );
      },
    );

    ws.on(
      'message',
      (data) => {
        shell.write(
          data.toString(),
        );
      },
    );

    const cleanup =
      () => {
        shell.kill();

        execFile(
          'docker',
          [
            'kill',
            containerName,
          ],
          () => {},
        );
      };

    ws.on(
      'close',
      cleanup,
    );

    shell.onExit(
      () => {
        ws.close();
      },
    );
  },
);

const wssKubernetes = new WebSocketServer({ noServer: true });

wssKubernetes.on('connection', async (ws, request) => {
  const url = new URL(request.url, 'http://localhost');
  const encodedSetup = url.searchParams.get('setupScript') ?? '';
  const setupScript = encodedSetup
    ? Buffer.from(encodedSetup, 'base64').toString('utf8')
    : '';
  const containerName = `elab-term-kubernetes-${crypto.randomUUID()}`;

  ws.send('Starting session...\r\n');

  const startResult = await runDocker(
    [
      'run', '-d', '--rm',
      '--name', containerName,
      '--network', 'none',
      '--memory', '128m',
      '--memory-swap', '128m',
      '--cpus', '0.5',
      '--pids-limit', '64',
      '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges',
      '--read-only',
      '--tmpfs', '/tmp:rw,exec,nosuid,nodev,size=64m',
      KUBERNETES_IMAGE,
      'sleep', 'infinity',
    ],
    30_000,
  );

  if (startResult.error) {
    console.error('Failed to start Kubernetes terminal session:', startResult.error);
    ws.send('Failed to start session.\r\n');
    ws.send(`${startResult.stderr || startResult.error.message}\r\n`);
    ws.close();
    return;
  }

  ws.send('Preparing environment...\r\n');

  const setupShellCommand = `
mkdir -p /tmp/task
cd /tmp/task

{
:
${setupScript}
} > /tmp/setup-output.txt 2>&1
  `.trim();

  const setupResult = await runDocker([
    'exec', containerName, 'sh', '-lc', setupShellCommand,
  ]);

  if (setupResult.error) {
    ws.send('Failed to prepare environment.\r\n');
    ws.send(`${setupResult.stderr || setupResult.error.message}\r\n`);
  }

  ws.send(`__ELAB_CONTROL__:${JSON.stringify({ containerName })}`);

  const shell = pty.spawn(
    'docker',
    ['exec', '-it', '-w', '/tmp/task', containerName, 'bash'],
    { name: 'xterm-color', cols: 80, rows: 30 },
  );

  shell.onData((data) => { ws.send(data); });
  ws.on('message', (data) => { shell.write(data.toString()); });

  const cleanup = () => {
    shell.kill();
    execFile('docker', ['kill', containerName], () => {});
  };

  ws.on('close', cleanup);
  shell.onExit(() => { ws.close(); });
});

const wssCicd = new WebSocketServer({ noServer: true });

wssCicd.on('connection', async (ws, request) => {
  try {
  const url = new URL(request.url, 'http://localhost');
  const encodedSetup = url.searchParams.get('setupScript') ?? '';
  const setupScript = encodedSetup
    ? Buffer.from(encodedSetup, 'base64').toString('utf8')
    : '';
  const containerName = `elab-term-cicd-${crypto.randomUUID()}`;

  ws.send('Starting session...\r\n');

  const startResult = await runDocker(
    [
      'run', '-d', '--rm',
      '--name', containerName,
      '--network', 'none',
      '--memory', '128m',
      '--memory-swap', '128m',
      '--cpus', '0.5',
      '--pids-limit', '64',
      '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges',
      '--read-only',
      '--tmpfs', '/tmp:rw,exec,nosuid,nodev,size=64m',
      CICD_IMAGE,
      'sleep', 'infinity',
    ],
    30_000,
  );

  if (startResult.error) {
    console.error('Failed to start CI/CD terminal session:', startResult.error);
    ws.send('Failed to start session.\r\n');
    ws.send(`${startResult.stderr || startResult.error.message}\r\n`);
    ws.close();
    return;
  }

  ws.send('Preparing environment...\r\n');

  const setupShellCommand = `
mkdir -p /tmp/task
cd /tmp/task

{
:
${setupScript}
} > /tmp/setup-output.txt 2>&1
  `.trim();

  const setupResult = await runDocker([
    'exec', containerName, 'sh', '-lc', setupShellCommand,
  ]);

  if (setupResult.error) {
    ws.send('Failed to prepare environment.\r\n');
    ws.send(`${setupResult.stderr || setupResult.error.message}\r\n`);
  }

  ws.send(`__ELAB_CONTROL__:${JSON.stringify({ containerName })}`);

  const shell = pty.spawn(
    'docker',
    ['exec', '-it', '-w', '/tmp/task', containerName, 'bash'],
    { name: 'xterm-color', cols: 80, rows: 30 },
  );

  shell.onData((data) => { ws.send(data); });
  ws.on('message', (data) => { shell.write(data.toString()); });

  const cleanup = () => {
    shell.kill();
    execFile('docker', ['kill', containerName], () => {});
  };

  ws.on('close', cleanup);
  shell.onExit(() => { ws.close(); });
  } catch (error) {
    console.error('CI/CD terminal session crashed:', error);
    try {
      ws.send(`\r\nInternal error: ${error && error.stack ? error.stack : error}\r\n`);
    } catch {}
    ws.close();
  }
});

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
      'Supported languages: C, C++, Java, C#, Python, Go, Ruby, Swift, Git, Linux, Docker',
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

    console.log(
      `Linux image: ${LINUX_IMAGE}`,
    );

    console.log(
      `Docker image: ${DOCKER_IMAGE}`,
    );
  },
);