import { prisma } from '../../config/database';
import { LicenseStatus, PaymentStatus } from '@prisma/client';
import {
  clubSelect,
  paymentReceiptSelect,
  type ClubWithRelations,
  type PaymentReceiptWithRelations,
  type UpdateClubInput,
} from './club.types';

export const findClubById = async (id: number): Promise<ClubWithRelations | null> => {
  return prisma.club.findUnique({ where: { id }, select: clubSelect });
};

export const findClubByDelegateUserId = async (userId: number): Promise<ClubWithRelations | null> => {
  return prisma.club.findFirst({
    where: {
      delegates: {
        some: { id: userId },
      },
    },
    select: clubSelect,
  });
};

export const updateClub = async (
  id: number,
  data: UpdateClubInput,
): Promise<ClubWithRelations> => {
  await prisma.club.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.website !== undefined && { website: data.website }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
    },
  });
  return prisma.club.findUniqueOrThrow({ where: { id }, select: clubSelect });
};

export const findPlayerById = async (
  playerId: number,
): Promise<{ id: number; clubId: number | null; userId: number } | null> => {
  return prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, clubId: true, userId: true },
  });
};

export const addPlayerToClub = async (
  playerId: number,
  clubId: number,
): Promise<ClubWithRelations> => {
  await prisma.player.update({
    where: { id: playerId },
    data: { clubId },
  });
  return prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: clubSelect });
};

export const removePlayerFromClub = async (playerId: number): Promise<ClubWithRelations> => {
  const player = await prisma.player.findUniqueOrThrow({
    where: { id: playerId },
    select: { clubId: true },
  });
  const clubId = player.clubId!;
  await prisma.player.update({
    where: { id: playerId },
    data: { clubId: null },
  });
  return prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: clubSelect });
};

export const findPendingPayments = async (
  clubId: number,
  tournamentId?: number,
): Promise<PaymentReceiptWithRelations[]> => {
  return prisma.paymentReceipt.findMany({
    where: {
      status: PaymentStatus.pending,
      registration: {
        tournament: {
          organizerId: clubId,
          ...(tournamentId !== undefined && { id: tournamentId }),
        },
      },
    },
    select: paymentReceiptSelect,
  });
};

export const findPaymentReceiptById = async (
  id: number,
): Promise<PaymentReceiptWithRelations | null> => {
  return prisma.paymentReceipt.findUnique({ where: { id }, select: paymentReceiptSelect });
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

export const findExpiringLicenses = async (clubId: number, daysThreshold: number) => {
  const threshold = new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000);
  return prisma.license.findMany({
    where: {
      player: { clubId },
      status: LicenseStatus.active,
      expiresAt: { lte: threshold },
    },
    include: {
      player: {
        include: { user: true },
      },
    },
    orderBy: { expiresAt: 'asc' },
  });
};

export const findRecentRegistrations = async (clubId: number, limit: number) => {
  return prisma.registration.findMany({
    where: {
      tournament: { organizerId: clubId },
    },
    orderBy: { registeredAt: 'desc' },
    take: limit,
    include: {
      player: { include: { user: true } },
      tournament: true,
    },
  });
};

export const countPendingPayments = async (clubId: number): Promise<number> => {
  return prisma.paymentReceipt.count({
    where: {
      status: PaymentStatus.pending,
      registration: {
        tournament: { organizerId: clubId },
      },
    },
  });
};
