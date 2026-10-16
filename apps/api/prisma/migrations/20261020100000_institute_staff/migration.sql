-- AlterTable
ALTER TABLE "users" ADD COLUMN     "staffPermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "staffTitle" TEXT;

-- CreateTable
CREATE TABLE "_StaffGroups" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StaffGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_StaffGroups_B_index" ON "_StaffGroups"("B");

-- AddForeignKey
ALTER TABLE "_StaffGroups" ADD CONSTRAINT "_StaffGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "learner_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StaffGroups" ADD CONSTRAINT "_StaffGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;