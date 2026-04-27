import { GraphQLError } from 'graphql';
import { NotificationType, PaymentStatus } from '@prisma/client';
import * as clubModel from './club.model';
import { sendPushNotification } from '../../common/notification/notification.service';
import {
  getAvatarUploadUrl,
  getAvatarPublicUrl,
  deleteFile,
} from '../../common/storage/storage.service';
import type { ClubWithRelations, PaymentReceiptWithRelations, UpdateClubInput, ClubPlayerOutput } from './club.types';

const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export const getAllClubs = async (): Promise<ClubWithRelations[]> => {
  return clubModel.findAllClubs();
};

export const getClubs = async (params: {
  filters?: { name?: string; community?: string };
  page?: number;
  limit?: number;
}): Promise<{ nodes: ClubWithRelations[]; totalCount: number; hasNextPage: boolean }> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const { nodes, totalCount } = await clubModel.findClubs({ filters: params.filters, page, limit });
  return { nodes, totalCount, hasNextPage: totalCount > page * limit };
};

export const getClub = async (id: number): Promise<ClubWithRelations> => {
  const club = await clubModel.findClubById(id);
  if (!club)
    // TODO: migrar a union type NotFoundError
    throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });
  return club;
};

export const getMyClub = async (userId: number): Promise<ClubWithRelations> => {
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    // TODO: migrar a union type NotFoundError
    throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });
  return club;
};

export const updateClub = async (
  id: number,
  input: UpdateClubInput,
  userId: number,
): Promise<ClubWithRelations> => {
  const club = await clubModel.findClubById(id);
  if (!club)
    throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });

  const isDelegateOfClub = club.delegates.some((d) => d.userId === userId);
  if (!isDelegateOfClub)
    // TODO: migrar a union type UnauthorizedError
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  return clubModel.updateClub(id, input);
};

export const addPlayerToClub = async (
  playerId: number,
  userId: number,
): Promise<ClubWithRelations> => {
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const player = await clubModel.findPlayerById(playerId);
  if (!player)
    // TODO: migrar a union type NotFoundError
    throw new GraphQLError('Player not found', { extensions: { code: 'NOT_FOUND' } });

  if (player.clubId === club.id)
    // TODO: migrar a union type ConflictError
    throw new GraphQLError('El jugador ya pertenece a este club', { extensions: { code: 'CONFLICT' } });

  return clubModel.addPlayerToClub(playerId, club.id);
};

export const removePlayerFromClub = async (
  playerId: number,
  userId: number,
): Promise<ClubWithRelations> => {
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const player = await clubModel.findPlayerById(playerId);
  if (!player)
    throw new GraphQLError('Player not found', { extensions: { code: 'NOT_FOUND' } });

  if (player.clubId !== club.id)
    throw new GraphQLError('El jugador no pertenece a este club', { extensions: { code: 'CONFLICT' } });

  return clubModel.removePlayerFromClub(playerId);
};

export const getPendingPayments = async (
  userId: number,
  tournamentId?: string,
): Promise<PaymentReceiptWithRelations[]> => {
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  return clubModel.findPendingPayments(
    club.id,
    tournamentId ? Number(tournamentId) : undefined,
  );
};

export const validatePayment = async (
  paymentReceiptId: number,
  userId: number,
): Promise<PaymentReceiptWithRelations> => {
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const receipt = await clubModel.findPaymentReceiptById(paymentReceiptId);
  if (!receipt)
    throw new GraphQLError('Payment receipt not found', { extensions: { code: 'NOT_FOUND' } });

  const tournamentOrganizerId = receipt.registration?.tournament.organizerId;
  if (tournamentOrganizerId !== club.id)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  if (receipt.status !== PaymentStatus.pending)
    // TODO: migrar a union type ConflictError
    throw new GraphQLError('El comprobante ya fue procesado', { extensions: { code: 'CONFLICT' } });

  const updatedReceipt = await clubModel.updatePaymentStatus(paymentReceiptId, 'validated', userId, new Date());

  const playerUserId = receipt.registration?.player.userId;
  const tournamentId = receipt.registration?.tournament.id;
  const tournamentName = receipt.registration?.tournament.name;
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
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const receipt = await clubModel.findPaymentReceiptById(paymentReceiptId);
  if (!receipt)
    throw new GraphQLError('Payment receipt not found', { extensions: { code: 'NOT_FOUND' } });

  const tournamentOrganizerId = receipt.registration?.tournament.organizerId;
  if (tournamentOrganizerId !== club.id)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  if (receipt.status !== PaymentStatus.pending)
    throw new GraphQLError('El comprobante ya fue procesado', { extensions: { code: 'CONFLICT' } });

  const updatedReceipt = await clubModel.updatePaymentStatus(paymentReceiptId, 'rejected', userId, new Date());

  const playerUserId = receipt.registration?.player.userId;
  const tournamentId = receipt.registration?.tournament.id;
  const tournamentName = receipt.registration?.tournament.name;
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

  return updatedReceipt;
};

export const getExpiringLicenses = async (userId: number, daysThreshold = 30) => {
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  return clubModel.findExpiringLicenses(club.id, daysThreshold);
};

export const getClubPlayers = async (params: {
  clubId: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ nodes: ClubPlayerOutput[]; totalCount: number; hasNextPage: boolean }> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  const { nodes, totalCount } = await clubModel.findClubPlayers({
    clubId: Number(params.clubId),
    search: params.search,
    page,
    limit,
  });

  return {
    nodes: nodes.map((node) => ({
      id: node.id.toString(),
      fullName: node.user.fullName,
      avatarUrl: node.user.avatarUrl ?? undefined,
      fideId: node.fideId ?? undefined,
      elo: {
        fideClassical: node.elo.fideClassical,
        fadaClassical: node.elo.fadaClassical,
      },
      licenses: node.licenses.map((l) => ({
        id: l.id.toString(),
        type: l.type,
        status: l.status,
        expiresAt: l.expiresAt.toISOString(),
      })),
    })),
    totalCount,
    hasNextPage: totalCount > page * limit,
  };
};

export const searchUserByEmail = async (
  email: string,
  _requestingUserId: number,
): Promise<{ id: number; email: string; fullName: string; role: string } | null> => {
  return clubModel.findUserByEmail(email);
};

export const addDelegate = async (
  clubId: number,
  userEmail: string,
  requestingUserId: number,
): Promise<ClubWithRelations> => {
  const club = await clubModel.findClubById(clubId);
  if (!club)
    throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });

  const isDelegate = club.delegates.some((d) => d.userId === requestingUserId);
  if (!isDelegate)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const user = await clubModel.findUserByEmail(userEmail);
  if (!user)
    throw new GraphQLError('No user found with that email', { extensions: { code: 'NOT_FOUND' } });

  const alreadyDelegate = club.delegates.some((d) => d.userId === user.id);
  if (alreadyDelegate)
    throw new GraphQLError('This user is already a delegate of the club', { extensions: { code: 'CONFLICT' } });

  return clubModel.addDelegateToClub(clubId, user.id);
};

export const removeDelegate = async (
  clubId: number,
  delegateId: number,
  requestingUserId: number,
): Promise<ClubWithRelations> => {
  const club = await clubModel.findClubById(clubId);
  if (!club)
    throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });

  const isDelegate = club.delegates.some((d) => d.userId === requestingUserId);
  if (!isDelegate)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  if (delegateId === requestingUserId)
    throw new GraphQLError('You cannot remove yourself as a delegate', { extensions: { code: 'BAD_USER_INPUT' } });

  const targetIsDelegate = club.delegates.some((d) => d.userId === delegateId);
  if (!targetIsDelegate)
    throw new GraphQLError('This user is not a delegate of the club', { extensions: { code: 'NOT_FOUND' } });

  return clubModel.removeDelegateFromClub(clubId, delegateId);
};

export const getClubLogoUploadUrl = async (
  clubId: number,
  fileName: string,
  mimeType: string,
  userId: number,
): Promise<{ uploadUrl: string; token: string; path: string }> => {
  const club = await clubModel.findClubById(clubId);
  if (!club)
    throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });

  const isDelegate = club.delegates.some((d) => d.id === userId);
  if (!isDelegate)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  if (!ALLOWED_LOGO_TYPES.includes(mimeType))
    throw new GraphQLError('File type not allowed', { extensions: { code: 'BAD_USER_INPUT' } });

  const path = `${clubId}/${Date.now()}-${fileName}`;
  const { uploadUrl, token } = await getAvatarUploadUrl({ path });
  return { uploadUrl, token, path };
};

export const confirmClubLogoUpload = async (
  clubId: number,
  path: string,
  userId: number,
): Promise<ClubWithRelations> => {
  const club = await clubModel.findClubById(clubId);
  if (!club)
    throw new GraphQLError('Club not found', { extensions: { code: 'NOT_FOUND' } });

  const isDelegate = club.delegates.some((d) => d.id === userId);
  if (!isDelegate)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const publicUrl = getAvatarPublicUrl(path);

  if (club.logoUrl) {
    const oldPath = club.logoUrl.split('/storage/v1/object/public/avatar/')[1];
    if (oldPath) deleteFile({ bucket: 'avatar', path: oldPath }).catch(() => { });
  }

  return clubModel.updateClubLogoUrl(clubId, publicUrl);
};

export const getDelegateDashboard = async (userId: number) => {
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const [pendingPaymentsCount, expiringLicenses] = await Promise.all([
    clubModel.countPendingPayments(club.id),
    clubModel.findExpiringLicenses(club.id, 30),
  ]);

  return {
    pendingPaymentsCount,
    expiringLicensesCount: expiringLicenses.length,
    expiringLicenses: expiringLicenses.map((license) => ({
      id: license.id.toString(),
      type: license.type,
      expiresAt: license.expiresAt.toISOString(),
      player: {
        id: license.player.id.toString(),
        fullName: license.player.user.fullName,
      },
    })),
  };
};

export const getRecentRegistrations = async (
  userId: number,
  page: number,
  limit: number,
) => {
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const { nodes, totalCount } = await clubModel.findRecentRegistrations({
    clubId: club.id,
    page,
    limit,
  });

  const hasNextPage = totalCount > page * limit;

  return {
    totalCount,
    hasNextPage,
    nodes: nodes.map((reg) => ({
      id: reg.id.toString(),
      status: reg.status,
      registeredAt: reg.registeredAt.toISOString(),
      player: {
        id: reg.player.id.toString(),
        fullName: reg.player.user.fullName,
      },
      tournament: {
        id: reg.tournament.id.toString(),
        name: reg.tournament.name,
        startDate: reg.tournament.startDate.toISOString(),
      },
    })),
  };
};
