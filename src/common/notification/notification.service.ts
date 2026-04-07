import { NotificationStatus } from '@prisma/client';
import type { Expo as ExpoType } from 'expo-server-sdk' with { 'resolution-mode': 'import' };
import type { NotificationInput } from './notification.types';
import * as notificationModel from './notification.model';

let _expo: ExpoType | null = null;

async function getExpoClient(): Promise<ExpoType> {
  if (!_expo) {
    const { Expo } = await import('expo-server-sdk');
    _expo = new Expo();
  }
  return _expo;
}

export const sendPushNotification = async ({
  userId,
  type,
  title,
  message,
  data,
}: NotificationInput): Promise<void> => {
  const notificationId = await notificationModel.saveNotification({ userId, type, title, message, data });

  const pushToken = await notificationModel.findUserPushToken(userId);
  if (!pushToken) return;

  const { Expo } = await import('expo-server-sdk');
  if (!Expo.isExpoPushToken(pushToken)) return;

  const expo = await getExpoClient();

  try {
    await expo.sendPushNotificationsAsync([
      {
        to: pushToken,
        title,
        body: message,
        data: data ?? {},
        sound: 'default',
      },
    ]);
    await notificationModel.updateNotificationStatus(notificationId, NotificationStatus.sent);
  } catch {
    await notificationModel.updateNotificationStatus(notificationId, NotificationStatus.failed);
  }
};
