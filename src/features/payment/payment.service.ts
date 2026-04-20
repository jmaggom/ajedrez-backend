import { GraphQLError } from 'graphql';
import * as paymentModel from './payment.model';
import type {
  PaymentHistoryEntry,
  PaymentReceiptWithRelations,
  GetReceiptUploadUrlInput,
  ConfirmReceiptUploadInput,
} from './payment.types';
import type { GetUploadUrlResult } from '../../common/storage/storage.types';
import {
  getReceiptSignedUrl as storageGetReceiptSignedUrl,
  buildReceiptPath,
  getReceiptUploadUrl as storageGetReceiptUploadUrl,
  verifyFileExists,
} from '../../common/storage/storage.service';
import { ALLOWED_RECEIPT_TYPES } from '../../common/storage/storage.constant';

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

export const getReceiptUploadUrl = async (
  input: GetReceiptUploadUrlInput,
  userId: number,
): Promise<GetUploadUrlResult> => {
  const registration = await paymentModel.findRegistrationById(Number(input.registrationId));
  if (!registration)
    throw new GraphQLError('Registration not found', { extensions: { code: 'NOT_FOUND' } });

  if (registration.player.userId !== userId)
    throw new GraphQLError('You cannot upload a receipt for a registration that is not yours', {
      extensions: { code: 'FORBIDDEN' },
    });

  if (registration.paymentReceipt !== null)
    throw new GraphQLError('A receipt already exists for this registration', {
      extensions: { code: 'CONFLICT' },
    });

  if (!ALLOWED_RECEIPT_TYPES.includes(input.mimeType))
    throw new GraphQLError('File type not allowed', {
      extensions: { code: 'BAD_USER_INPUT' },
    });

  const path = buildReceiptPath({
    userId,
    registrationId: Number(input.registrationId),
    fileName: input.fileName,
  });

  const { uploadUrl, token } = await storageGetReceiptUploadUrl({ path });

  return { uploadUrl, token, path };
};

export const confirmReceiptUpload = async (
  input: ConfirmReceiptUploadInput,
  userId: number,
): Promise<PaymentReceiptWithRelations> => {
  const registration = await paymentModel.findRegistrationById(Number(input.registrationId));
  if (!registration)
    throw new GraphQLError('Registration not found', { extensions: { code: 'NOT_FOUND' } });

  if (registration.player.userId !== userId)
    throw new GraphQLError('You cannot confirm the receipt of a registration that is not yours', {
      extensions: { code: 'FORBIDDEN' },
    });

  const fileExists = await verifyFileExists({ bucket: 'receipt', path: input.path });
  if (!fileExists)
    throw new GraphQLError('The file has not been uploaded correctly', {
      extensions: { code: 'BAD_USER_INPUT' },
    });

  const created = await paymentModel.createPaymentReceipt({
    registrationId: Number(input.registrationId),
    amount: input.amount,
    fileUrl: input.path,
  });

  const receipt = await paymentModel.findPaymentReceiptById(created.id);
  if (!receipt)
    throw new GraphQLError('Error saving the receipt', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });

  return receipt;
};

export const getReceiptSignedUrl = async (
  paymentReceiptId: number,
  userId: number,
): Promise<string> => {
  const receipt = await paymentModel.findPaymentReceiptById(paymentReceiptId);
  if (!receipt)
    throw new GraphQLError('Receipt not found', { extensions: { code: 'NOT_FOUND' } });

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

  return storageGetReceiptSignedUrl(receipt.fileUrl);
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
