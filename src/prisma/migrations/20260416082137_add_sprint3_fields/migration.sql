/*
  Warnings:

  - The `result` column on the `Game` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('white_wins', 'black_wins', 'draw');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'result';

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "description" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "registeredById" INTEGER,
DROP COLUMN "result",
ADD COLUMN     "result" "GameResult";

-- AlterTable
ALTER TABLE "PaymentReceipt" ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedById" INTEGER;

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "registeredById" INTEGER;

-- CreateIndex
CREATE INDEX "License_expiresAt_idx" ON "License"("expiresAt");

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
