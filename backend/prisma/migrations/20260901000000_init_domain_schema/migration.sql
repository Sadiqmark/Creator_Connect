-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CREATOR', 'BUSINESS');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INQUIRY_RECEIVED', 'INQUIRY_ACCEPTED', 'INQUIRY_REJECTED', 'INQUIRY_EXPIRED', 'COLLABORATION_EMAIL_UPDATED');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('INQUIRY_CREATED', 'INQUIRY_ACCEPTED', 'INQUIRY_REJECTED', 'INQUIRY_EXPIRED', 'INQUIRY_CLOSED', 'COLLABORATION_EMAIL_UPDATED', 'ACCOUNT_DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "firebase_uid" VARCHAR(128) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "profile_photo_url" VARCHAR(500),
    "niche" VARCHAR(100) NOT NULL,
    "location" VARCHAR(150) NOT NULL,
    "bio" TEXT NOT NULL,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "instagram_url" VARCHAR(300),
    "youtube_url" VARCHAR(300),
    "collaboration_email" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state_or_province" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "collaboration_email" VARCHAR(255),
    "logo_url" VARCHAR(500),
    "website_url" VARCHAR(300),
    "instagram_url" VARCHAR(300),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'PENDING',
    "collaboration_type" VARCHAR(100) NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "deliverables" TEXT NOT NULL,
    "timeline_start" DATE,
    "timeline_end" DATE,
    "brief" TEXT NOT NULL,
    "additional_requirements" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "responded_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_creators" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "reference_id" UUID,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "event_type" "AuditEventType" NOT NULL,
    "actor_user_id" UUID,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" UUID NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_user_id_key" ON "creator_profiles"("user_id");

-- CreateIndex
CREATE INDEX "creator_profiles_niche_idx" ON "creator_profiles"("niche");

-- CreateIndex
CREATE INDEX "creator_profiles_location_idx" ON "creator_profiles"("location");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_user_id_key" ON "business_profiles"("user_id");

-- CreateIndex
CREATE INDEX "business_profiles_category_idx" ON "business_profiles"("category");

-- CreateIndex
CREATE INDEX "inquiries_business_id_status_created_at_idx" ON "inquiries"("business_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "inquiries_creator_id_status_created_at_idx" ON "inquiries"("creator_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "inquiries_status_expires_at_idx" ON "inquiries"("status", "expires_at");

-- CreateIndex: PostgreSQL Partial Unique Index for Duplicate Active Inquiry Constraint
CREATE UNIQUE INDEX "unique_active_business_creator_inquiry" ON "inquiries"("business_id", "creator_id") WHERE "status" IN ('PENDING', 'ACCEPTED');

-- CreateIndex
CREATE INDEX "saved_creators_business_id_created_at_idx" ON "saved_creators"("business_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "saved_creators_business_id_creator_id_key" ON "saved_creators"("business_id", "creator_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_resource_type_resource_id_created_at_idx" ON "audit_events"("resource_type", "resource_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_actor_user_id_idx" ON "audit_events"("actor_user_id");

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_creators" ADD CONSTRAINT "saved_creators_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_creators" ADD CONSTRAINT "saved_creators_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
