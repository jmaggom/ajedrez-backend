-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "planActivo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "lastLatitude" DOUBLE PRECISION,
ADD COLUMN     "lastLocationAt" TIMESTAMP(3),
ADD COLUMN     "lastLongitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "geoNotificationActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "notificationRadius" INTEGER;
