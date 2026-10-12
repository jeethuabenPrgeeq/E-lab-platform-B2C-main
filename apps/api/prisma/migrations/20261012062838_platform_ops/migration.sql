-- CreateEnum
CREATE TYPE "RunKind" AS ENUM ('run', 'submit');

-- CreateEnum
CREATE TYPE "RunState" AS ENUM ('queued', 'running', 'done', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "judge_workers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "version" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'online',
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "judge_workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_runs" (
    "id" TEXT NOT NULL,
    "kind" "RunKind" NOT NULL,
    "state" "RunState" NOT NULL DEFAULT 'queued',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "userId" TEXT,
    "problemSlug" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "workspaceType" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL,
    "input" TEXT,
    "workerId" TEXT,
    "outcome" TEXT,
    "verdict" TEXT,
    "originalVerdict" TEXT,
    "overrideReason" TEXT,
    "testsPassed" INTEGER,
    "testsTotal" INTEGER,
    "durationMs" INTEGER,
    "exitCode" INTEGER,
    "stdout" TEXT,
    "stderr" TEXT,
    "results" JSONB,
    "error" TEXT,
    "rejudgeJobId" TEXT,
    "rejudgeOfId" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "code_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rejudge_jobs" (
    "id" TEXT NOT NULL,
    "problemSlug" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "since" TIMESTAMP(3),
    "total" INTEGER NOT NULL DEFAULT 0,
    "done" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "changes" JSONB NOT NULL DEFAULT '{}',
    "startedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "rejudge_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plagiarism_flags" (
    "id" TEXT NOT NULL,
    "problemSlug" TEXT NOT NULL,
    "runAId" TEXT NOT NULL,
    "runBId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plagiarism_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runtime_entries" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runtime_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "judge_workers_host_key" ON "judge_workers"("host");

-- CreateIndex
CREATE INDEX "code_runs_kind_queuedAt_idx" ON "code_runs"("kind", "queuedAt");

-- CreateIndex
CREATE INDEX "code_runs_state_idx" ON "code_runs"("state");

-- CreateIndex
CREATE INDEX "code_runs_problemSlug_kind_idx" ON "code_runs"("problemSlug", "kind");

-- CreateIndex
CREATE INDEX "code_runs_userId_queuedAt_idx" ON "code_runs"("userId", "queuedAt");

-- CreateIndex
CREATE INDEX "rejudge_jobs_createdAt_idx" ON "rejudge_jobs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "plagiarism_flags_runAId_runBId_key" ON "plagiarism_flags"("runAId", "runBId");

-- CreateIndex
CREATE INDEX "runtime_entries_kind_idx" ON "runtime_entries"("kind");

-- AddForeignKey
ALTER TABLE "code_runs" ADD CONSTRAINT "code_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_runs" ADD CONSTRAINT "code_runs_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "judge_workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_runs" ADD CONSTRAINT "code_runs_rejudgeJobId_fkey" FOREIGN KEY ("rejudgeJobId") REFERENCES "rejudge_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rejudge_jobs" ADD CONSTRAINT "rejudge_jobs_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
