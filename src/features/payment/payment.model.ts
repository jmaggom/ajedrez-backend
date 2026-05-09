import { prisma } from '../../config/database';
import { PaymentStatus, type PaymentReceipt, type RegistrationStatus } from '@prisma/client';
import { paymentReceiptSelect, type PaymentReceiptWithRelations, registrationWithOwnerSelect, type RegistrationWithOwner } from './payment.types';


export const findPaymentReceiptById = async (
  id: number,
): Promise<PaymentReceiptWithRelations | null> => {
  return prisma.paymentReceipt.findUnique({ where: { id }, select: paymentReceiptSelect });
};

export const findPaymentsByPlayer = async (
  userId: number,
): Promise<PaymentReceiptWithRelations[]> => {
  return prisma.paymentReceipt.findMany({
    where: {
      registration: {
        player: { userId },
      },
    },
    select: paymentReceiptSelect,
    orderBy: { date: 'desc' },
  });
};

export const findRegistrationById = async (
  id: number,
): Promise<RegistrationWithOwner | null> => {
  return prisma.registration.findUnique({
    where: { id },
    select: registrationWithOwnerSelect,
  });
};

export const createPaymentReceipt = async (data: {
  registrationId: number;
  amount: number;
  fileUrl: string;
}): Promise<PaymentReceipt> => {
  return prisma.paymentReceipt.create({
    data: {
      registrationId: data.registrationId,
      amount: data.amount,
      fileUrl: data.fileUrl,
    },
  });
};

export const findClubDelegate = async (
  userId: number,
  clubId: number,
): Promise<boolean> => {
  const count = await prisma.club.count({
    where: {
      id: clubId,
      delegates: {
        some: { userId },
      },
    },
  });
  return count > 0;
};

export const updateRegistrationStatus = async (
  registrationId: number,
  status: string,
): Promise<void> => {
  await prisma.registration.update({
    where: { id: registrationId },
    data: { status: status as RegistrationStatus },
  });
};

export const updatePaymentStatus = async (
  id: number,
  status: 'validated' | 'rejected',
  validatedById: number,
  validatedAt: Date,
): Promise<PaymentReceiptWithRelations> => {
  const statusMap = {
    validated: PaymentStatus.validated,
    rejected: PaymentStatus.rejected,
  } as const;

  await prisma.paymentReceipt.update({
    where: { id },
    data: {
      status: statusMap[status],
      validatedById,
      validatedAt,
    },
  });
  return prisma.paymentReceipt.findUniqueOrThrow({ where: { id }, select: paymentReceiptSelect });
};

export const updateRegistrationPayment = async (
  registrationId: number,
  data: { status?: RegistrationStatus; paymentStatus?: PaymentStatus },
): Promise<void> => {
  await prisma.registration.update({ where: { id: registrationId }, data });
};

export const findClubByDelegateUserId = async (userId: number) => {
  return prisma.club.findFirst({
    where: {
      delegates: {
        some: { userId },
      },
    },
    select: { id: true },
  });
};

/**
 * Transacción atómica para validar un recibo de pago.
 * Actualiza el estado del recibo y de la inscripción asociada.
 */
export const validatePaymentTransaction = async (
  paymentReceiptId: number,
  userId: number,
): Promise<PaymentReceiptWithRelations | null> => {
  return prisma.$transaction(async (tx) => {
    const receipt = await tx.paymentReceipt.findUnique({
      where: { id: paymentReceiptId },
      select: { registration: { select: { id: true } } },
    });

    await tx.paymentReceipt.update({
      where: { id: paymentReceiptId },
      data: {
        status: PaymentStatus.validated,
        validatedById: userId,
        validatedAt: new Date(),
      },
    });

    if (receipt?.registration?.id) {
      await tx.registration.update({
        where: { id: receipt.registration.id },
        data: {
          status: 'confirmed' as RegistrationStatus,
          paymentStatus: PaymentStatus.validated,
        },
      });
    }

    return tx.paymentReceipt.findUnique({ where: { id: paymentReceiptId }, select: paymentReceiptSelect });
  });
};

/**
 * Transacción atómica para rechazar un recibo de pago.
 * Actualiza el estado del recibo y cancela la inscripción asociada.
 */
export const rejectPaymentTransaction = async (
  paymentReceiptId: number,
  userId: number,
): Promise<PaymentReceiptWithRelations | null> => {
  return prisma.$transaction(async (tx) => {
    const receipt = await tx.paymentReceipt.findUnique({
      where: { id: paymentReceiptId },
      select: { registration: { select: { id: true } } },
    });

    await tx.paymentReceipt.update({
      where: { id: paymentReceiptId },
      data: {
        status: PaymentStatus.rejected,
        validatedById: userId,
        validatedAt: new Date(),
      },
    });

    if (receipt?.registration?.id) {
      await tx.registration.update({
        where: { id: receipt.registration.id },
        data: {
          status: 'cancelled' as RegistrationStatus,
          paymentStatus: PaymentStatus.rejected,
        },
      });
    }

    return tx.paymentReceipt.findUnique({ where: { id: paymentReceiptId }, select: paymentReceiptSelect });
  });
};
