-- AlterTable
ALTER TABLE "content_batches" ADD COLUMN     "assignedGroupId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "learnerGroupId" TEXT;

-- CreateTable
CREATE TABLE "learner_groups" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learner_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learner_groups_organizationId_name_key" ON "learner_groups"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_learnerGroupId_fkey" FOREIGN KEY ("learnerGroupId") REFERENCES "learner_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_groups" ADD CONSTRAINT "learner_groups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_batches" ADD CONSTRAINT "content_batches_assignedGroupId_fkey" FOREIGN KEY ("assignedGroupId") REFERENCES "learner_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
