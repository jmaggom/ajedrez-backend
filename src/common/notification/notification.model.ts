import { GraphQLError } from 'graphql';
import { Notification, NotificationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotificationInput } from './notification.types';

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

export const markNotificationAsRead = async (
  notificationId: number,
  userId: number,
): Promise<void> => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true },
  });

  if (!notification || notification.userId !== userId) {
    throw new GraphQLError('Notification not found', { extensions: { code: 'NOT_FOUND' } });
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};
