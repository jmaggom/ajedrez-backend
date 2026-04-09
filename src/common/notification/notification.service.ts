import { NotificationStatus } from '@prisma/client';
import type { Expo as ExpoType, ExpoPushMessage } from 'expo-server-sdk' with { 'resolution-mode': 'import' };
import type { NotificationInput } from './notification.types';
import * as notificationModel from './notification.model';

let _expo: ExpoType | null = null;

async function getExpoClient(): Promise<{ client: ExpoType; Expo: typeof ExpoType }> {
  const { Expo } = await import('expo-server-sdk');
  if (!_expo) {
    _expo = new Expo();
  }
  return { client: _expo, Expo };
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
  if (!pushToken) {
    await notificationModel.updateNotificationStatus(notificationId, NotificationStatus.skipped);
    return;
  }

  const { client: expo, Expo } = await getExpoClient();

  if (!Expo.isExpoPushToken(pushToken)) {
    await notificationModel.updateNotificationStatus(notificationId, NotificationStatus.skipped);
    return;
  }

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

export const sendBatchPushNotifications = async (
  inputs: NotificationInput[],
): Promise<void> => {
  if (inputs.length === 0) return;

  const { client: expo, Expo } = await getExpoClient();

  const notificationIds = await Promise.all(
    inputs.map((input) =>
      notificationModel.saveNotification({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data,
      }),
    ),
  );

  const pushTokens = await Promise.all(
    inputs.map((input) => notificationModel.findUserPushToken(input.userId)),
  );

  const validMessages: Array<{ message: ExpoPushMessage; notificationId: number }> = [];
  const skippedIds: number[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const token = pushTokens[i];
    const notificationId = notificationIds[i];
    const input = inputs[i];

    if (!token || !Expo.isExpoPushToken(token)) {
      skippedIds.push(notificationId);
      continue;
    }

    validMessages.push({
      message: {
        to: token,
        title: input.title,
        body: input.message,
        data: input.data ?? {},
        sound: 'default',
      },
      notificationId,
    });
  }

  await Promise.all(
    skippedIds.map((id) =>
      notificationModel.updateNotificationStatus(id, NotificationStatus.skipped),
    ),
  );

  const CHUNK_SIZE = 100;
  for (let i = 0; i < validMessages.length; i += CHUNK_SIZE) {
    const chunk = validMessages.slice(i, i + CHUNK_SIZE);
    try {
      await expo.sendPushNotificationsAsync(chunk.map((c) => c.message));
      await Promise.all(
        chunk.map((c) =>
          notificationModel.updateNotificationStatus(c.notificationId, NotificationStatus.sent),
        ),
      );
    } catch {
      await Promise.all(
        chunk.map((c) =>
          notificationModel.updateNotificationStatus(c.notificationId, NotificationStatus.failed),
        ),
      );
    }
  }
};
