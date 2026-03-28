/*
  Warnings:

  - You are about to drop the column `newEloId` on the `EloHistory` table. All the data in the column will be lost.
  - You are about to drop the column `previousEloId` on the `EloHistory` table. All the data in the column will be lost.
  - You are about to drop the column `tournamentId` on the `EloHistory` table. All the data in the column will be lost.
  - You are about to drop the column `rulesJson` on the `Tournament` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[playerId,source,period]` on the table `EloHistory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `period` to the `EloHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `EloHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requirements` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EloSource" AS ENUM ('fide_api', 'fada_api', 'online_api');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'referee';

-- DropForeignKey
ALTER TABLE "EloHistory" DROP CONSTRAINT "EloHistory_newEloId_fkey";

-- DropForeignKey
ALTER TABLE "EloHistory" DROP CONSTRAINT "EloHistory_previousEloId_fkey";

-- DropForeignKey
ALTER TABLE "EloHistory" DROP CONSTRAINT "EloHistory_tournamentId_fkey";

-- AlterTable
ALTER TABLE "Elo" ADD COLUMN     "fadaBlitzGames" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fadaClassicalGames" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fadaRapidGames" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fideBlitzGames" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fideClassicalGames" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fideRapidGames" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onlineBlitzGames" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onlineClassicalGames" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onlineRapidGames" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EloHistory" DROP COLUMN "newEloId",
DROP COLUMN "previousEloId",
DROP COLUMN "tournamentId",
ADD COLUMN     "blitz" INTEGER,
ADD COLUMN     "blitzGames" INTEGER,
ADD COLUMN     "classical" INTEGER,
ADD COLUMN     "classicalGames" INTEGER,
ADD COLUMN     "period" TEXT NOT NULL,
ADD COLUMN     "rapid" INTEGER,
ADD COLUMN     "rapidGames" INTEGER,
ADD COLUMN     "source" "EloSource" NOT NULL;

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "eloEligible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "federation" TEXT;

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "rulesJson",
ADD COLUMN     "eloEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requirements" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "TournamentResult" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "finalPosition" INTEGER NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "winsAsWhite" INTEGER NOT NULL DEFAULT 0,
    "drawsAsWhite" INTEGER NOT NULL DEFAULT 0,
    "lossesAsWhite" INTEGER NOT NULL DEFAULT 0,
    "winsAsBlack" INTEGER NOT NULL DEFAULT 0,
    "drawsAsBlack" INTEGER NOT NULL DEFAULT 0,
    "lossesAsBlack" INTEGER NOT NULL DEFAULT 0,
    "performanceRating" INTEGER,
    "eloEligible" BOOLEAN NOT NULL DEFAULT false,
    "isFideRated" BOOLEAN NOT NULL DEFAULT false,
    "isFadaRated" BOOLEAN NOT NULL DEFAULT false,
    "eloChangeFide" INTEGER,
    "eloChangeFada" INTEGER,
    "eloChangeOnline" INTEGER,

    CONSTRAINT "TournamentResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentResult_playerId_tournamentId_key" ON "TournamentResult"("playerId", "tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "EloHistory_playerId_source_period_key" ON "EloHistory"("playerId", "source", "period");

-- AddForeignKey
ALTER TABLE "TournamentResult" ADD CONSTRAINT "TournamentResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentResult" ADD CONSTRAINT "TournamentResult_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
