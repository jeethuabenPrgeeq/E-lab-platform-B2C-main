-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminRoleId" TEXT,
ADD COLUMN     "adminScope" TEXT NOT NULL DEFAULT 'All institutions',
ADD COLUMN     "invitedByName" TEXT,
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revokeReason" TEXT;

-- CreateTable
CREATE TABLE "admin_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "system" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_adminRoleId_fkey" FOREIGN KEY ("adminRoleId") REFERENCES "admin_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
