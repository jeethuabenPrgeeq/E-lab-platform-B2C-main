-- AlterEnum
ALTER TYPE "UserRole" RENAME VALUE 'CONTENT_MANAGER' TO 'INSTITUTE_ADMIN';

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('university', 'college', 'corporate', 'skill_academy', 'bootcamp', 'ngo', 'government');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'suspended');

-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "contactEmail" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE INDEX "problems_organizationId_idx" ON "problems"("organizationId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Institute Admins take permissions from their institution, not from an admin role
UPDATE "users" SET "adminRoleId" = NULL WHERE "role" = 'INSTITUTE_ADMIN';
UPDATE "users" SET "adminRoleId" = NULL WHERE "adminRoleId" = 'content_manager';
DELETE FROM "admin_roles" WHERE "id" = 'content_manager';

-- Super Admin manages institutions
UPDATE "admin_roles" SET "permissions" = "permissions" || '["institutions.manage"]'::jsonb, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 'super_admin' AND NOT ("permissions" ? 'institutions.manage');
