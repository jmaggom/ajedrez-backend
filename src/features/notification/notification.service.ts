import { GraphQLError } from 'graphql';
import { Notification } from '@prisma/client';
import * as notificationModel from './notification.model';

export const getMyNotifications = async (
  userId: number,
  limit: number,
  offset: number,
): Promise<{ nodes: Notification[]; totalCount: number; unreadCount: number }> => {
  const [nodes, totalCount, unreadCount] = await Promise.all([
    notificationModel.findUserNotifications(userId, limit, offset),
    notificationModel.countUserNotifications(userId),
    notificationModel.countUnreadUserNotifications(userId),
  ]);
  return { nodes, totalCount, unreadCount };
};

export const markAsRead = async (
  notificationId: number,
  userId: number,
): Promise<boolean> => {
  const updated = await notificationModel.markNotificationAsRead(notificationId, userId);
  if (!updated)
    throw new GraphQLError('Notification not found', { extensions: { code: 'NOT_FOUND' } });
  return true;
};
