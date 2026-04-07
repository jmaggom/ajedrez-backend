import { GraphQLError } from 'graphql';
import { LicenseStatus, LicenseType, Role, RegistrationStatus, TournamentStatus } from '@prisma/client';
import * as tournamentModel from './tournament.model';
import { NotificationType } from '@prisma/client';
import { sendPushNotification } from '../../common/notification/notification.service';
import { FREEMIUM_MAX_ACTIVE_TOURNAMENTS } from './constants';
import type {
  CreateTournamentInput,
  DeleteTournamentResult,
  EloFilter,
  RegistrationResult,
  TournamentFiltersInput,
  TournamentRequirements,
  TournamentWithRelations,
  UpdateTournamentInput,
} from './tournament.types';

const validateEloFilter = (
  elo: {
    fideClassical: number; fideRapid: number; fideBlitz: number;
    fadaClassical: number; fadaRapid: number; fadaBlitz: number;
  },
  eloFilter: EloFilter,
): void => {
  const checks: Array<{ min?: number; max?: number; value: number }> = [
    { min: eloFilter.minFideClassical, max: eloFilter.maxFideClassical, value: elo.fideClassical },
    { min: eloFilter.minFideRapid, max: eloFilter.maxFideRapid, value: elo.fideRapid },
    { min: eloFilter.minFideBlitz, max: eloFilter.maxFideBlitz, value: elo.fideBlitz },
    { min: eloFilter.minFadaClassical, max: eloFilter.maxFadaClassical, value: elo.fadaClassical },
    { min: eloFilter.minFadaRapid, max: eloFilter.maxFadaRapid, value: elo.fadaRapid },
    { min: eloFilter.minFadaBlitz, max: eloFilter.maxFadaBlitz, value: elo.fadaBlitz },
  ];

  for (const { min, max, value } of checks) {
    if (min !== undefined && value < min)
      throw new GraphQLError('ELO too low', { extensions: { code: 'ELO_TOO_LOW' } });
    if (max !== undefined && value > max)
      throw new GraphQLError('ELO too high', { extensions: { code: 'ELO_TOO_HIGH' } });
  }
};

export const getTournaments = async (
  filters: TournamentFiltersInput,
): Promise<{ nodes: TournamentWithRelations[]; totalCount: number; hasNextPage: boolean }> => {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const { nodes, totalCount } = await tournamentModel.findTournaments(filters);
  const hasNextPage = totalCount > page * limit;
  return { nodes, totalCount, hasNextPage };
};

export const getTournamentById = async (id: number): Promise<TournamentWithRelations> => {
  const tournament = await tournamentModel.findTournamentById(id);
  if (!tournament)
    throw new GraphQLError('Tournament not found', { extensions: { code: 'NOT_FOUND' } });
  return tournament;
};

export const createTournament = async (
  input: CreateTournamentInput,
  userId: number,
) => {
  const user = await tournamentModel.findUserWithRole(userId);
  if (!user || (user.role !== Role.delegate && user.role !== Role.referee && user.role !== Role.admin))
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  if (user.role === Role.delegate) {
    if (!user.clubId)
      throw new GraphQLError('No club assigned', { extensions: { code: 'NO_CLUB_ASSIGNED' } });
    const activeCount = await tournamentModel.countActiveTournamentsByOrganizer(user.clubId);
    if (activeCount >= FREEMIUM_MAX_ACTIVE_TOURNAMENTS)
      throw new GraphQLError('Active tournament limit reached', { extensions: { code: 'FREEMIUM_LIMIT_REACHED' } });
  }

  const organizerId = user.clubId!;

  if (input.geoNotificationActive) {
    const club = await tournamentModel.findClubById(organizerId);
    if (!club?.planActivo)
      throw new GraphQLError('La geo-notificación requiere plan Club Plus', {
        extensions: { code: 'PREMIUM_REQUIRED' },
      });
  }

  const tournament = await tournamentModel.createTournament(organizerId, input);

  if (input.geoNotificationActive && input.latitude && input.longitude && input.notificationRadius) {
    const nearbyPlayers = await tournamentModel.findPlayersInRadius(
      input.latitude,
      input.longitude,
      input.notificationRadius,
    );
    await Promise.allSettled(
      nearbyPlayers.map((p) =>
        sendPushNotification({
          userId: p.userId,
          type: NotificationType.tournament,
          title: '¡Nuevo torneo cerca!',
          message: `${input.name} se jugará en ${input.venue}.`,
          data: { tournamentId: String(tournament.id) },
        }),
      ),
    );
  }

  return tournament;
};

export const updateTournament = async (
  id: number,
  input: UpdateTournamentInput,
  userId: number,
) => {
  const tournament = await tournamentModel.findTournamentById(id);
  if (!tournament)
    throw new GraphQLError('Tournament not found', { extensions: { code: 'NOT_FOUND' } });

  const user = await tournamentModel.findUserWithRole(userId);
  if (!user || (user.role !== Role.admin && user.clubId !== tournament.organizerId))
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  return tournamentModel.updateTournament(id, input);
};

export const deleteTournament = async (
  id: number,
  userId: number,
): Promise<DeleteTournamentResult> => {
  const user = await tournamentModel.findUserWithRole(userId);
  if (!user || user.role !== Role.admin)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const tournament = await tournamentModel.findTournamentById(id);
  if (!tournament)
    throw new GraphQLError('Tournament not found', { extensions: { code: 'NOT_FOUND' } });

  const hadConfirmedRegistrations = tournament.registrations.some(
    (r) => r.status === RegistrationStatus.confirmed,
  );

  await tournamentModel.deleteTournament(id);
  return { success: true, hadConfirmedRegistrations };
};

export const registerTournament = async (
  tournamentId: number,
  userId: number,
): Promise<RegistrationResult> => {
  const tournament = await tournamentModel.findTournamentById(tournamentId);
  if (!tournament)
    throw new GraphQLError('Tournament not found', { extensions: { code: 'NOT_FOUND' } });

  if (tournament.status !== TournamentStatus.open)
    throw new GraphQLError('Tournament is not open for registration', {
      extensions: { code: 'TOURNAMENT_NOT_OPEN' },
    });

  const player = await tournamentModel.findPlayerWithEloAndLicenses(userId);
  if (!player)
    throw new GraphQLError('Player profile required', {
      extensions: { code: 'PLAYER_PROFILE_REQUIRED' },
    });

  const existing = await tournamentModel.findRegistration(player.id, tournamentId);
  if (existing)
    throw new GraphQLError('Already registered', { extensions: { code: 'ALREADY_REGISTERED' } });

  const requirements = tournament.requirements as TournamentRequirements;
  const { eloFilter } = requirements;

  if (requirements.requireFideId) {
    const hasActiveFide = player.licenses.some(
      (l) => l.type === LicenseType.fide && l.status === LicenseStatus.active,
    );
    if (!hasActiveFide)
      throw new GraphQLError('FIDE license required', {
        extensions: { code: 'FIDE_LICENSE_REQUIRED' },
      });
  }

  if (requirements.requireFadaId) {
    const hasActiveFada = player.licenses.some(
      (l) => l.type === LicenseType.fada && l.status === LicenseStatus.active,
    );
    if (!hasActiveFada)
      throw new GraphQLError('FADA license required', {
        extensions: { code: 'FADA_LICENSE_REQUIRED' },
      });
  }

  if (eloFilter && player.elo)
    validateEloFilter(player.elo, eloFilter);

  const activeCount = await tournamentModel.countActiveRegistrations(tournamentId);

  if (activeCount < tournament.availableSlots) {
    const registration = await tournamentModel.createRegistration(
      player.id,
      tournamentId,
      RegistrationStatus.pending,
    );
    await sendPushNotification({
      userId,
      type: NotificationType.registration,
      title: 'Inscripción registrada',
      message: `Tu inscripción en ${tournament.name} está pendiente de confirmación.`,
      data: { tournamentId: String(tournamentId) },
    });
    return { registration };
  }

  const registration = await tournamentModel.createRegistration(
    player.id,
    tournamentId,
    RegistrationStatus.waitlist,
  );
  const waitlistPosition = await tournamentModel.countWaitlistRegistrations(tournamentId);
  return { registration, waitlistPosition };
};

export const getNearbyTournaments = async (
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<TournamentWithRelations[]> => {
  return tournamentModel.findNearbyTournaments(lat, lng, radiusKm);
};

export const cancelRegistration = async (
  registrationId: number,
  userId: number,
): Promise<boolean> => {
  const registration = await tournamentModel.findRegistrationById(registrationId);
  if (!registration)
    throw new GraphQLError('Registration not found', { extensions: { code: 'NOT_FOUND' } });

  const user = await tournamentModel.findUserWithRole(userId);
  if (!user)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const isOrganizerDelegate =
    user.role === Role.delegate && user.clubId === registration.tournament.organizerId;
  const isOwner = registration.player.userId === userId;

  if (!isOrganizerDelegate && !isOwner)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  if (!isOrganizerDelegate && registration.status === RegistrationStatus.confirmed)
    throw new GraphQLError('Cannot cancel a confirmed registration', {
      extensions: { code: 'CANNOT_CANCEL_CONFIRMED' },
    });

  await tournamentModel.updateRegistrationStatus(registrationId, RegistrationStatus.cancelled);

  const nextInWaitlist = await tournamentModel.findFirstWaitlistRegistration(
    registration.tournamentId,
  );
  if (nextInWaitlist)
    await tournamentModel.updateRegistrationStatus(nextInWaitlist.id, RegistrationStatus.pending);

  return true;
};
