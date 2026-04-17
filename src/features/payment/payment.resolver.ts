import { GraphQLError } from 'graphql';
import type { Context } from '../../common/context.types';
import * as paymentService from './payment.service';

export const paymentResolvers = {
  Query: {
    myPayments: (
      _: unknown,
      __: unknown,
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return paymentService.getMyPayments(context.user.id);
    },

    paymentReceipt: (
      _: unknown,
      { id }: { id: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return paymentService.getPaymentReceipt(Number(id), context.user.id);
    },
  },
};
