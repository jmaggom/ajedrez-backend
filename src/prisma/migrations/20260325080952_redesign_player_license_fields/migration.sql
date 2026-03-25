/*
  Warnings:

  - You are about to drop the column `federationId` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `licenseNumber` on the `Player` table. All the data in the column will be lost.
  - Added the required column `type` to the `License` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('fada', 'fide', 'feda', 'online');

-- AlterTable
ALTER TABLE "License" ADD COLUMN     "type" "LicenseType" NOT NULL;

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "federationId",
DROP COLUMN "licenseNumber",
ADD COLUMN     "fideId" TEXT;
