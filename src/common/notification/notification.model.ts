import { NotificationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import type { NotificationInput } from './notification.types';

export const findUserPushToken = async (userId: number): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true },
  });
  return user?.pushToken ?? null;
};

export const saveNotification = async (
  { userId, type, title, message, data }: NotificationInput,
): Promise<number> => {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, dataJson: data },
    select: { id: true },
  });
  return notification.id;
};

export const updateNotificationStatus = async (
  id: number,
  status: NotificationStatus,
): Promise<void> => {
  await prisma.notification.update({
    where: { id },
    data: { status },
  });
};
