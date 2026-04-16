import { GraphQLError } from 'graphql';
import { PaymentStatus } from '@prisma/client';
import * as clubModel from './club.model';
import type { ClubWithRelations, PaymentReceiptWithRelations, UpdateClubInput } from './club.types';

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

  const isDelegateOfClub = club.delegates.some((d) => d.id === userId);
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

  return clubModel.updatePaymentStatus(paymentReceiptId, 'validated', userId, new Date());
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

  console.log('Rechazo:', reason);
  // TODO: crear notificación al jugador

  return clubModel.updatePaymentStatus(paymentReceiptId, 'rejected', userId, new Date());
};

export const getExpiringLicenses = async (userId: number, daysThreshold = 30) => {
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  return clubModel.findExpiringLicenses(club.id, daysThreshold);
};

export const getDelegateDashboard = async (userId: number) => {
  const club = await clubModel.findClubByDelegateUserId(userId);
  if (!club)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const [pendingPaymentsCount, recentRegistrations, expiringLicenses] = await Promise.all([
    clubModel.countPendingPayments(club.id),
    clubModel.findRecentRegistrations(club.id, 10),
    clubModel.findExpiringLicenses(club.id, 30),
  ]);

  return { pendingPaymentsCount, recentRegistrations, expiringLicenses };
};
