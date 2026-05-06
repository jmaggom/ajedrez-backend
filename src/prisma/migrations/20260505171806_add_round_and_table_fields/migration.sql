-- AlterEnum
ALTER TYPE "GameResult" ADD VALUE 'bye';

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_blackPlayerId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_whitePlayerId_fkey";

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "byePlayerId" INTEGER,
ADD COLUMN     "isBye" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tableNumber" INTEGER,
ALTER COLUMN "whitePlayerId" DROP NOT NULL,
ALTER COLUMN "blackPlayerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "currentRound" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_whitePlayerId_fkey" FOREIGN KEY ("whitePlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_blackPlayerId_fkey" FOREIGN KEY ("blackPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_byePlayerId_fkey" FOREIGN KEY ("byePlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
