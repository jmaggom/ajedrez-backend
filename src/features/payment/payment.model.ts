import { prisma } from '../../config/database';
import { Role } from '@prisma/client';
import { paymentReceiptSelect, type PaymentReceiptWithRelations } from './payment.types';

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

export const findClubDelegate = async (
  userId: number,
  clubId: number,
): Promise<boolean> => {
  const count = await prisma.club.count({
    where: {
      id: clubId,
      delegates: {
        some: { id: userId, role: Role.delegate },
      },
    },
  });
  return count > 0;
};
