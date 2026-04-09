import { Notification } from '@prisma/client';
import * as notificationModel from '../../common/notification/notification.model';

export const getMyNotifications = async (
  userId: number,
  limit: number,
  offset: number,
): Promise<{ nodes: Notification[]; totalCount: number }> => {
  const nodes = await notificationModel.findUserNotifications(userId, limit, offset);
  return { nodes, totalCount: nodes.length };
};

export const markAsRead = async (
  notificationId: number,
  userId: number,
): Promise<boolean> => {
  await notificationModel.markNotificationAsRead(notificationId, userId);
  return true;
};
