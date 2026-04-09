-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'skipped';

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);
