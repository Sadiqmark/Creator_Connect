-- AlterEnum
ALTER TYPE "AccountStatus" ADD VALUE 'DEACTIVATED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventType" ADD VALUE 'ACCOUNT_DEACTIVATED';
ALTER TYPE "AuditEventType" ADD VALUE 'ACCOUNT_REACTIVATED';
ALTER TYPE "AuditEventType" ADD VALUE 'ACCOUNT_PERMANENTLY_DELETED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deactivated_at" TIMESTAMPTZ,
ADD COLUMN     "deletion_scheduled_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "email_reservations" (
    "id" UUID NOT NULL,
    "email_hash" VARCHAR(64) NOT NULL,
    "reserved_until" TIMESTAMPTZ NOT NULL,
    "reason" VARCHAR(50) NOT NULL DEFAULT 'ACCOUNT_DELETION',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_firebase_deletions" (
    "id" UUID NOT NULL,
    "firebase_uid" VARCHAR(128) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_firebase_deletions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_reservations_email_hash_key" ON "email_reservations"("email_hash");

-- CreateIndex
CREATE INDEX "email_reservations_reserved_until_idx" ON "email_reservations"("reserved_until");

-- CreateIndex
CREATE UNIQUE INDEX "pending_firebase_deletions_firebase_uid_key" ON "pending_firebase_deletions"("firebase_uid");

-- CreateIndex
CREATE INDEX "pending_firebase_deletions_last_attempt_at_created_at_idx" ON "pending_firebase_deletions"("last_attempt_at", "created_at");

-- CreateIndex
CREATE INDEX "users_status_deletion_scheduled_at_idx" ON "users"("status", "deletion_scheduled_at");
