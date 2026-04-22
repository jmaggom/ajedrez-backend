import { GraphQLError } from 'graphql';
import type { Context } from '../../common/context.types';
import * as paymentService from './payment.service';
import type { GetReceiptUploadUrlInput, ConfirmReceiptUploadInput } from './payment.types';

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

    receiptSignedUrl: (
      _: unknown,
      { paymentReceiptId }: { paymentReceiptId: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return paymentService.getReceiptSignedUrl(Number(paymentReceiptId), context.user.id);
    },
  },

  Mutation: {
    getReceiptUploadUrl: (
      _: unknown,
      { input }: { input: GetReceiptUploadUrlInput },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return paymentService.getReceiptUploadUrl(input, context.user.id);
    },

    confirmReceiptUpload: (
      _: unknown,
      { input }: { input: ConfirmReceiptUploadInput },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return paymentService.confirmReceiptUpload(input, context.user.id);
    },
  },
};
