import { GraphQLError } from 'graphql';
import type { Context } from '../../common/context.types';
import * as notificationService from './notification.service';

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

export const notificationResolvers = {
  Query: {
    myNotifications: (
      _: unknown,
      { limit, offset }: { limit?: number; offset?: number },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return notificationService.getMyNotifications(
        context.user.id,
        limit ?? DEFAULT_LIMIT,
        offset ?? DEFAULT_OFFSET,
      );
    },
  },

  Notification: {
    type: (parent: { type: string }) => parent.type.toUpperCase(),
    status: (parent: { status: string }) => parent.status.toUpperCase(),
    data: (parent: { dataJson?: unknown }) =>
      parent.dataJson ? JSON.stringify(parent.dataJson) : null,
    createdAt: (parent: { createdAt: Date }) => parent.createdAt.toISOString(),
  },

  Mutation: {
    markNotificationAsRead: (
      _: unknown,
      { id }: { id: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return notificationService.markAsRead(Number(id), context.user.id);
    },
  },
};
