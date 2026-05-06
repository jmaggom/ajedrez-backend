-- AlterEnum
ALTER TYPE "RegistrationStatus" RENAME TO "RegistrationStatus_old";
CREATE TYPE "RegistrationStatus" AS ENUM ('confirmed', 'pending', 'cancelled', 'awaiting_payment');
ALTER TABLE "Registration" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Registration" ALTER COLUMN "status" TYPE "RegistrationStatus" USING ("status"::text::"RegistrationStatus");
ALTER TABLE "Registration" ALTER COLUMN "status" SET DEFAULT 'pending';
DROP TYPE "RegistrationStatus_old";

-- AlterTable
ALTER TABLE "Registration" DROP COLUMN "waitlistPosition";

-- CreateTable
CREATE TABLE "TournamentNotifyRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentNotifyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentNotifyRequest_userId_tournamentId_key" ON "TournamentNotifyRequest"("userId", "tournamentId");

-- AddForeignKey
ALTER TABLE "TournamentNotifyRequest" ADD CONSTRAINT "TournamentNotifyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentNotifyRequest" ADD CONSTRAINT "TournamentNotifyRequest_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
