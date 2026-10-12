/*
  Warnings:

  - You are about to drop the `admins` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LEARNER', 'PLATFORM_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "PracticeUploadMethod" AS ENUM ('manual', 'csv', 'ai');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('draft', 'validation_pending', 'validation_failed', 'validated', 'ready_to_publish', 'published', 'unpublished', 'archived');

-- DropTable
DROP TABLE "admins";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'LEARNER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_draft_batches" (
    "id" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "method" "PracticeUploadMethod" NOT NULL,
    "source" TEXT,
    "savedCount" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_draft_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_drafts" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "problemId" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "status" "DraftStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practice_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_tokenHash_key" ON "refresh_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_sessions_userId_idx" ON "refresh_sessions"("userId");

-- CreateIndex
CREATE INDEX "practice_draft_batches_createdById_idx" ON "practice_draft_batches"("createdById");

-- CreateIndex
CREATE INDEX "practice_drafts_batchId_idx" ON "practice_drafts"("batchId");

-- CreateIndex
CREATE INDEX "practice_drafts_problemId_idx" ON "practice_drafts"("problemId");

-- CreateIndex
CREATE INDEX "practice_drafts_shortName_idx" ON "practice_drafts"("shortName");

-- AddForeignKey
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_draft_batches" ADD CONSTRAINT "practice_draft_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_drafts" ADD CONSTRAINT "practice_drafts_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "practice_draft_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
