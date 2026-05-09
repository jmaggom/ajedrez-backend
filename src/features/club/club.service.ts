import { GraphQLError } from 'graphql';
import * as clubModel from './club.model';
import {
  getAvatarUploadUrl,
  getAvatarPublicUrl,
  deleteFile,
} from '../../common/storage/storage.service';
import type { ClubWithRelations, UpdateClubInput, ClubPlayerOutput } from './club.types';

const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

/**
 * Verifica que el usuario sea delegado de un club y lo retorna.
 */
const requireDelegateClub = async (userId: number): Promise<ClubWithRelations> => {
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
  return club;
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

export const updateMyClub = async (
  userId: number,
  input: UpdateClubInput,
): Promise<ClubWithRelations> => {
  const club = await getMyClub(userId);
  return updateClub(club.id, input, userId);
};

export const addPlayerToClub = async (
  playerId: number,
  userId: number,
): Promise<ClubWithRelations> => {
  const club = await requireDelegateClub(userId);

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
  const club = await requireDelegateClub(userId);

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
  page: number = 1,
  limit: number = 10,
) => {
  const club = await requireDelegateClub(userId);

  return clubModel.findPendingPayments(
    club.id,
    tournamentId ? Number(tournamentId) : undefined,
    page,
    limit,
  );
};

export const getExpiringLicenses = async (userId: number, daysThreshold = 30) => {
  const club = await requireDelegateClub(userId);
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
): Promise<{ id: number; email: string; fullName: string; role: string; playerId: number | null } | null> => {
  const user = await clubModel.findUserByEmail(email);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    playerId: user.player?.id ?? null,
  };
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

  const isDelegate = club.delegates.some((d) => d.userId === userId);
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

  const isDelegate = club.delegates.some((d) => d.userId === userId);
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
  const club = await requireDelegateClub(userId);

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
  const club = await requireDelegateClub(userId);

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
