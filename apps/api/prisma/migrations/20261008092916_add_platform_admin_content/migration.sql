-- CreateEnum
CREATE TYPE "TechnologyCategory" AS ENUM ('language', 'framework', 'database', 'devops', 'tool');

-- CreateEnum
CREATE TYPE "TechnologyStatus" AS ENUM ('active', 'draft', 'disabled');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('draft', 'review', 'ready', 'published', 'deprecated');

-- CreateEnum
CREATE TYPE "SourceCheckKind" AS ENUM ('required', 'forbidden');

-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedById" TEXT,
ADD COLUMN     "referenceSolution" TEXT,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "status" "ProblemStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "technologies" ADD COLUMN     "category" "TechnologyCategory" NOT NULL DEFAULT 'language',
ADD COLUMN     "fileExtension" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "judgeLanguage" TEXT,
ADD COLUMN     "runtimeImage" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "status" "TechnologyStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "version" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "test_cases" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "timeoutMs" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "source_checks" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "kind" "SourceCheckKind" NOT NULL,
    "filePath" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "isRegex" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_versions" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technical_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "source_checks_problemId_idx" ON "source_checks"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "problem_versions_problemId_version_key" ON "problem_versions"("problemId", "version");

-- CreateIndex
CREATE INDEX "technical_audit_logs_createdAt_idx" ON "technical_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "technical_audit_logs_entityType_entityId_idx" ON "technical_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "technical_audit_logs_actorId_idx" ON "technical_audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "problems_status_idx" ON "problems"("status");

-- CreateIndex
CREATE INDEX "problems_technologyId_idx" ON "problems"("technologyId");

-- CreateIndex
CREATE INDEX "test_cases_problemId_position_idx" ON "test_cases"("problemId", "position");

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_checks" ADD CONSTRAINT "source_checks_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_versions" ADD CONSTRAINT "problem_versions_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_versions" ADD CONSTRAINT "problem_versions_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_audit_logs" ADD CONSTRAINT "technical_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
