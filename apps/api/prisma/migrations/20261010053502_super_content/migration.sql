-- CreateEnum
CREATE TYPE "AccessTier" AS ENUM ('free', 'starter', 'professional', 'premium');

-- CreateEnum
CREATE TYPE "CatalogVisibility" AS ENUM ('listed', 'hidden', 'retired');

-- CreateEnum
CREATE TYPE "PathLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "PathStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ChallengeKind" AS ENUM ('weekly', 'monthly', 'hiring', 'sponsored');

-- CreateEnum
CREATE TYPE "ChallengeAccess" AS ENUM ('everyone', 'paid');

-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tier" "AccessTier" NOT NULL DEFAULT 'free',
ADD COLUMN     "visibility" "CatalogVisibility" NOT NULL DEFAULT 'listed',
ADD COLUMN     "visibilityReason" TEXT;

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "level" "PathLevel" NOT NULL,
    "tier" "AccessTier" NOT NULL DEFAULT 'free',
    "status" "PathStatus" NOT NULL DEFAULT 'draft',
    "certificate" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_steps" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "learning_path_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "ChallengeKind" NOT NULL,
    "sponsor" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "prize" INTEGER NOT NULL DEFAULT 0,
    "access" "ChallengeAccess" NOT NULL DEFAULT 'everyone',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_problems" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "challenge_problems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_paths_status_idx" ON "learning_paths"("status");

-- CreateIndex
CREATE INDEX "learning_path_steps_pathId_position_idx" ON "learning_path_steps"("pathId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_steps_pathId_problemId_key" ON "learning_path_steps"("pathId", "problemId");

-- CreateIndex
CREATE INDEX "challenges_startAt_idx" ON "challenges"("startAt");

-- CreateIndex
CREATE INDEX "challenge_problems_challengeId_position_idx" ON "challenge_problems"("challengeId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_problems_challengeId_problemId_key" ON "challenge_problems"("challengeId", "problemId");

-- CreateIndex
CREATE INDEX "problems_visibility_idx" ON "problems"("visibility");

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_steps" ADD CONSTRAINT "learning_path_steps_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_steps" ADD CONSTRAINT "learning_path_steps_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_problems" ADD CONSTRAINT "challenge_problems_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_problems" ADD CONSTRAINT "challenge_problems_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
