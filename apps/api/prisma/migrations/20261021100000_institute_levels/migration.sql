-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "environment" TEXT NOT NULL DEFAULT 'empty',
ADD COLUMN     "staffLevels" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "staffLevel" INTEGER;

UPDATE "organizations" SET "staffLevels" = 2;
UPDATE "users" SET "staffLevel" = 1 WHERE "staffTitle" IS NOT NULL;
