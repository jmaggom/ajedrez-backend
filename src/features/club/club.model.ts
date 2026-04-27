import { prisma } from '../../config/database';
import { LicenseStatus, PaymentStatus, Prisma } from '@prisma/client';
import {
  clubSelect,
  paymentReceiptSelect,
  type ClubWithRelations,
  type PaymentReceiptWithRelations,
  type UpdateClubInput,
} from './club.types';
import type { PlayerWithRelations } from './club.types';

export const findUserByEmail = async (email: string): Promise<{ id: number; email: string; fullName: string; role: string } | null> => {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, email: true, fullName: true, role: true },
  });
};

export const addDelegateToClub = async (clubId: number, userId: number): Promise<ClubWithRelations> => {
  await prisma.delegate.create({ data: { userId, clubId } });
  return prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: clubSelect });
};

export const removeDelegateFromClub = async (clubId: number, delegateUserId: number): Promise<ClubWithRelations> => {
  await prisma.delegate.delete({ where: { userId: delegateUserId } });
  return prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: clubSelect });
};

export const updateClubLogoUrl = async (clubId: number, logoUrl: string): Promise<ClubWithRelations> => {
  return prisma.club.update({
    where: { id: clubId },
    data: { logoUrl },
    select: clubSelect,
  });
};

export const findAllClubs = async (): Promise<ClubWithRelations[]> => {
  return prisma.club.findMany({ select: clubSelect, orderBy: { name: 'asc' } });
};

export const findClubs = async (params: {
  filters?: { name?: string; community?: string };
  page?: number;
  limit?: number;
}): Promise<{ nodes: ClubWithRelations[]; totalCount: number }> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  const where: Prisma.ClubWhereInput = {
    ...(params.filters?.name && {
      name: { contains: params.filters.name, mode: 'insensitive' },
    }),
    ...(params.filters?.community && {
      address: { contains: params.filters.community, mode: 'insensitive' },
    }),
  };

  const [nodes, totalCount] = await Promise.all([
    prisma.club.findMany({
      where,
      select: clubSelect,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.club.count({ where }),
  ]);

  return { nodes, totalCount };
};

export const findClubById = async (id: number): Promise<ClubWithRelations | null> => {
  return prisma.club.findUnique({ where: { id }, select: clubSelect });
};

export const findClubByDelegateUserId = async (userId: number): Promise<ClubWithRelations | null> => {
  return prisma.club.findFirst({
    where: {
      delegates: {
        some: { userId },
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

export const findRecentRegistrations = async (params: {
  clubId: number;
  page?: number;
  limit?: number;
}) => {
  const { clubId, page = 1, limit = 10 } = params;
  const skip = (page - 1) * limit;

  const [nodes, totalCount] = await Promise.all([
    prisma.registration.findMany({
      where: {
        tournament: {
          organizerId: clubId,
          status: { in: ['open', 'in_progress'] },
        },
      },
      orderBy: { registeredAt: 'desc' },
      skip,
      take: limit,
      include: {
        player: { include: { user: true } },
        tournament: true,
      },
    }),
    prisma.registration.count({
      where: {
        tournament: {
          organizerId: clubId,
          status: { in: ['open', 'in_progress'] },
        },
      },
    }),
  ]);

  return { nodes, totalCount };
};

export const findClubPlayers = async (params: {
  clubId: number;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ nodes: PlayerWithRelations[]; totalCount: number }> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  const where: Prisma.PlayerWhereInput = {
    clubId: params.clubId,
    ...(params.search && {
      user: {
        fullName: { contains: params.search, mode: 'insensitive' },
      },
    }),
  };

  const [nodes, totalCount] = await Promise.all([
    prisma.player.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        elo: { select: { fideClassical: true, fadaClassical: true } },
        licenses: {
          select: { id: true, type: true, status: true, expiresAt: true },
          orderBy: { expiresAt: 'desc' },
          take: 1,
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { user: { fullName: 'asc' } },
    }),
    prisma.player.count({ where }),
  ]);

  return { nodes, totalCount };
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
