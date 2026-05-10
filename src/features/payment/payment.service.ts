import { GraphQLError } from 'graphql';
import { NotificationType, PaymentStatus, RegistrationStatus } from '@prisma/client';
import * as paymentModel from './payment.model';
import { sendPushNotification } from '../../common/notification/notification.service';
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
import { findNotifyRequests } from '../tournament/tournament.model';

/**
 * Verifica que el usuario tenga acceso al recibo de pago.
 * Solo el owner del recibo o un delegado del organizador pueden acceder.
 * @throws {GraphQLError} NOT_FOUND si el recibo no existe
 * @throws {GraphQLError} FORBIDDEN si el usuario no tiene acceso
 */
const assertReceiptAccess = async (
  receiptId: number,
  userId: number,
): Promise<PaymentReceiptWithRelations> => {
  const receipt = await paymentModel.findPaymentReceiptById(receiptId);
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

  return receipt;
};

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

  try {
    const { uploadUrl, token } = await storageGetReceiptUploadUrl({ path });
    return { uploadUrl, token, path };
  } catch (err) {
    throw new GraphQLError(
      err instanceof Error ? err.message : 'Storage error al generar URL de subida',
      { extensions: { code: 'STORAGE_ERROR' } },
    );
  }
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

  if (registration.status === 'awaiting_payment') {
    await paymentModel.updateRegistrationStatus(
      Number(input.registrationId),
      RegistrationStatus.pending,
    );
  }

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
  const receipt = await assertReceiptAccess(paymentReceiptId, userId);
  return storageGetReceiptSignedUrl(receipt.fileUrl);
};

export const getPaymentReceipt = async (
  id: number,
  userId: number,
): Promise<PaymentReceiptWithRelations> => {
  return assertReceiptAccess(id, userId);
};

export const validatePayment = async (
  paymentReceiptId: number,
  userId: number,
): Promise<PaymentReceiptWithRelations> => {
  const club = await paymentModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const receipt = await paymentModel.findPaymentReceiptById(paymentReceiptId);
  if (!receipt)
    throw new GraphQLError('Payment receipt not found', { extensions: { code: 'NOT_FOUND' } });

  const tournamentOrganizerId = receipt.registration?.tournament.organizerId;
  if (tournamentOrganizerId !== club.id)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  if (receipt.status !== PaymentStatus.pending)
    throw new GraphQLError('El comprobante ya fue procesado', { extensions: { code: 'CONFLICT' } });

  const registrationId = receipt.registration?.id;
  const playerUserId = receipt.registration?.player.user.id;
  const tournamentId = receipt.registration?.tournament.id;
  const tournamentName = receipt.registration?.tournament.name;

  const updatedReceipt = await paymentModel.validatePaymentTransaction(paymentReceiptId, userId);

  if (!updatedReceipt)
    throw new GraphQLError('Error updating receipt', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

  if (playerUserId && tournamentId) {
    try {
      await sendPushNotification({
        userId: playerUserId,
        type: NotificationType.payment,
        title: 'Pago validado',
        message: `Tu comprobante de pago para ${tournamentName} ha sido validado`,
        data: {
          paymentReceiptId: String(paymentReceiptId),
          tournamentId: String(tournamentId),
        },
      });
    } catch (notifError) {
      console.error('Push notification failed:', notifError);
    }
  }

  return updatedReceipt;
};

export const rejectPayment = async (
  paymentReceiptId: number,
  userId: number,
  reason: string,
): Promise<PaymentReceiptWithRelations> => {
  const club = await paymentModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const receipt = await paymentModel.findPaymentReceiptById(paymentReceiptId);
  if (!receipt)
    throw new GraphQLError('Payment receipt not found', { extensions: { code: 'NOT_FOUND' } });

  const tournamentOrganizerId = receipt.registration?.tournament.organizerId;
  if (tournamentOrganizerId !== club.id)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  if (receipt.status !== PaymentStatus.pending)
    throw new GraphQLError('El comprobante ya fue procesado', { extensions: { code: 'CONFLICT' } });

  const registrationId = receipt.registration?.id;
  const playerUserId = receipt.registration?.player.user.id;
  const tournamentId = receipt.registration?.tournament.id;
  const tournamentName = receipt.registration?.tournament.name;

  const updatedReceipt = await paymentModel.rejectPaymentTransaction(paymentReceiptId, userId);

  if (!updatedReceipt)
    throw new GraphQLError('Error updating receipt', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

  if (playerUserId && tournamentId) {
    try {
      await sendPushNotification({
        userId: playerUserId,
        type: NotificationType.payment,
        title: 'Pago rechazado',
        message: `Tu comprobante de pago para ${tournamentName} ha sido rechazado. Motivo: ${reason}`,
        data: {
          paymentReceiptId: String(paymentReceiptId),
          tournamentId: String(tournamentId),
          reason,
        },
      });
    } catch (notifError) {
      console.error('Push notification failed:', notifError);
    }
  }

  if (tournamentId) {
    const notifyRequests = await findNotifyRequests(tournamentId);
    if (notifyRequests.length > 0) {
      await Promise.allSettled(
        notifyRequests.map((req: { userId: number }) =>
          sendPushNotification({
            userId: req.userId,
            type: NotificationType.tournament,
            title: 'Plaza disponible',
            message: `Se ha liberado una plaza en ${tournamentName}`,
            data: { tournamentId: String(tournamentId) },
          }),
        ),
      );
    }
  }

  return updatedReceipt;
};
