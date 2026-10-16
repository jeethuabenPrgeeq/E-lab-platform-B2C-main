-- CreateEnum
CREATE TYPE "ContentBatchType" AS ENUM ('regular_practice', 'stack_section', 'real_time_challenge');

-- CreateTable
CREATE TABLE "content_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "ContentBatchType" NOT NULL DEFAULT 'regular_practice',
    "focus" TEXT NOT NULL DEFAULT '',
    "easyTarget" INTEGER NOT NULL DEFAULT 0,
    "mediumTarget" INTEGER NOT NULL DEFAULT 0,
    "hardTarget" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_batch_items" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "content_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_batches_organizationId_idx" ON "content_batches"("organizationId");

-- CreateIndex
CREATE INDEX "content_batch_items_batchId_position_idx" ON "content_batch_items"("batchId", "position");

-- CreateIndex
CREATE INDEX "content_batch_items_problemId_idx" ON "content_batch_items"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "content_batch_items_batchId_problemId_key" ON "content_batch_items"("batchId", "problemId");

-- AddForeignKey
ALTER TABLE "content_batches" ADD CONSTRAINT "content_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_batches" ADD CONSTRAINT "content_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_batch_items" ADD CONSTRAINT "content_batch_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "content_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_batch_items" ADD CONSTRAINT "content_batch_items_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
