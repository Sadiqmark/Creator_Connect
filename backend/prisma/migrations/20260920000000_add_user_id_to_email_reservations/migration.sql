-- AlterTable
ALTER TABLE "email_reservations" ADD COLUMN "user_id" UUID;

-- AddForeignKey
ALTER TABLE "email_reservations" ADD CONSTRAINT "email_reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
