import { GraphQLError } from 'graphql';
import * as paymentModel from './payment.model';
import type { PaymentHistoryEntry, PaymentReceiptWithRelations } from './payment.types';


export const getMyPayments = async (userId: number): Promise<PaymentHistoryEntry[]> => {
  const receipts = await paymentModel.findPaymentsByPlayer(userId);
  return receipts.map((receipt) => ({
    id: String(receipt.id),
    amount: receipt.amount,
    date: receipt.date.toISOString(),
    status: receipt.status.toUpperCase(),
    validatedAt: receipt.validatedAt ? receipt.validatedAt.toISOString() : null,
    tournamentName: receipt.registration?.tournament.name ?? null,
  }));
};

export const getPaymentReceipt = async (
  id: number,
  userId: number,
): Promise<PaymentReceiptWithRelations> => {
  const receipt = await paymentModel.findPaymentReceiptById(id);
  if (!receipt)
    throw new GraphQLError('Payment receipt not found', { extensions: { code: 'NOT_FOUND' } });

  const playerUserId = receipt.registration?.player.user.id;
  const isOwner = playerUserId === userId;

  if (!isOwner) {
    const organizerId = receipt.registration?.tournament.organizerId;
    const isDelegate = organizerId
      ? await paymentModel.findClubDelegate(userId, organizerId)
      : false;

    if (!isDelegate)
      throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
  }

  return receipt;
};
