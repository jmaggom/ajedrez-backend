import { Notification } from '@prisma/client';
import { prisma } from '../../config/database';

export const findUserNotifications = async (
  userId: number,
  limit: number,
  offset: number,
): Promise<Notification[]> => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
};

export const countUserNotifications = async (userId: number): Promise<number> => {
  return prisma.notification.count({ where: { userId } });
};

export const markNotificationAsRead = async (
  notificationId: number,
  userId: number,
): Promise<boolean> => {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
  return result.count > 0;
};
