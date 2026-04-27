-- CreateTable
CREATE TABLE "Delegate" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "clubId" INTEGER NOT NULL,

    CONSTRAINT "Delegate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Delegate_userId_key" ON "Delegate"("userId");

-- AddForeignKey
ALTER TABLE "Delegate" ADD CONSTRAINT "Delegate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegate" ADD CONSTRAINT "Delegate_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MigrateData: mover delegates existentes de User.clubId a Delegate
INSERT INTO "Delegate" ("userId", "clubId")
SELECT "id", "clubId"
FROM "User"
WHERE "role" = 'delegate' AND "clubId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_clubId_fkey";

-- DropColumn
ALTER TABLE "User" DROP COLUMN "clubId";
