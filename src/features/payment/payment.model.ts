import { prisma } from '../../config/database';
import { Role } from '@prisma/client';
import type { PaymentReceipt } from '@prisma/client';
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
