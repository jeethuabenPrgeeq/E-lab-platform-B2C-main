-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assigneeId" TEXT;

-- CreateIndex
CREATE INDEX "problems_assigneeId_idx" ON "problems"("assigneeId");

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
