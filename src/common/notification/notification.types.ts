import type { NotificationType } from '@prisma/client';

export type NotificationInput = {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, string>;
};
