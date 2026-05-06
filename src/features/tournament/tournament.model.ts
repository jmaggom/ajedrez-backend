import { prisma } from '../../config/database';
import {
  Prisma,
  RegistrationStatus,
  TournamentStatus,
  type Registration,
  type Tournament,
} from '@prisma/client';
import type {
  CreateTournamentInput,
  TournamentFiltersInput,
  TournamentWithRelations,
  UpdateTournamentInput,
} from './tournament.types';
import { TournamentMode } from './tournament.types';
import { tournamentSelect } from './tournament.types';

export const findTournaments = async (
  filters: TournamentFiltersInput,
  myClubId?: number,
): Promise<{ nodes: TournamentWithRelations[]; totalCount: number }> => {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.TournamentWhereInput = {};

  const statusMap: Record<string, TournamentStatus> = {
    OPEN: TournamentStatus.open,
    DRAFT: TournamentStatus.draft,
    IN_PROGRESS: TournamentStatus.in_progress,
    FINISHED: TournamentStatus.finished,
  };
  if (filters.status && statusMap[filters.status]) where.status = statusMap[filters.status];

  const modeMap: Record<string, string> = {
    CLASSICAL: 'classical',
    RAPID: 'rapid',
    BLITZ: 'blitz',
  };
  if (filters.mode && modeMap[filters.mode]) where.mode = modeMap[filters.mode];

  if (filters.clubId) where.organizerId = Number(filters.clubId);

  if (filters.name) where.name = { contains: filters.name, mode: 'insensitive' };
  if (filters.dateFrom || filters.dateTo) {
    where.startDate = {};
    if (filters.dateFrom) where.startDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.startDate.lte = new Date(filters.dateTo);
  }

  // Filtro de drafts: si NO se pidió un status específico, excluir drafts
  // salvo los del propio club del delegado
  if (!filters.status) {
    if (myClubId !== undefined) {
      where.OR = [
        { status: { not: TournamentStatus.draft } },
        { status: TournamentStatus.draft, organizerId: myClubId },
      ];
    } else {
      where.status = { not: TournamentStatus.draft };
    }
  }

  const [nodes, totalCount] = await prisma.$transaction([
    prisma.tournament.findMany({ where, select: tournamentSelect, skip, take: limit }),
    prisma.tournament.count({ where }),
  ]);

  return { nodes, totalCount };
};

export const findTournamentById = async (
  id: number,
): Promise<TournamentWithRelations | null> => {
  return prisma.tournament.findUnique({ where: { id }, select: tournamentSelect });
};

export const findUserWithRole = async (
  userId: number,
): Promise<{ id: number; role: string; clubId: number | null } | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, delegate: { select: { clubId: true } } },
  });
  if (!user) return null;
  return {
    id: user.id,
    role: user.role,
    clubId: user.delegate?.clubId ?? null,
  };
};

export const countActiveTournamentsByOrganizer = async (
  organizerId: number,
): Promise<number> => {
  return prisma.tournament.count({
    where: {
      organizerId,
      status: { in: [TournamentStatus.draft, TournamentStatus.open, TournamentStatus.in_progress] },
    },
  });
};

export const findPlayerWithEloAndLicenses = async (userId: number) => {
  return prisma.player.findUnique({
    where: { userId },
    include: { elo: true, licenses: true },
  });
};

export const findRegistration = async (
  playerId: number,
  tournamentId: number,
): Promise<Registration | null> => {
  return prisma.registration.findFirst({
    where: { playerId, tournamentId, status: { not: RegistrationStatus.cancelled } }
  });
};

export const countActiveRegistrations = async (tournamentId: number): Promise<number> => {
  return prisma.registration.count({
    where: {
      tournamentId,
      status: { in: [RegistrationStatus.confirmed, RegistrationStatus.pending, RegistrationStatus.awaiting_payment] },
    },
  });
};


export const createRegistration = async (
  playerId: number,
  tournamentId: number,
  status: RegistrationStatus,
) => {
  return prisma.registration.create({
    data: { playerId, tournamentId, status },
    include: { player: true },
  });
};

export const findRegistrationById = async (registrationId: number) => {
  return prisma.registration.findUnique({
    where: { id: registrationId },
    include: { player: true, tournament: true },
  });
};

export const updateRegistrationStatus = async (
  registrationId: number,
  status: RegistrationStatus,
): Promise<Registration> => {
  return prisma.registration.update({
    where: { id: registrationId },
    data: { status },
  });
};


export const createTournament = async (
  organizerId: number,
  input: CreateTournamentInput,
): Promise<Tournament> => {
  return prisma.tournament.create({
    data: {
      organizerId,
      name: input.name,
      venue: input.venue,
      latitude: input.latitude,
      longitude: input.longitude,
      notificationRadius: input.notificationRadius,
      geoNotificationActive: input.geoNotificationActive,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      format: input.format,
      mode: { [TournamentMode.CLASSICAL]: 'classical', [TournamentMode.RAPID]: 'rapid', [TournamentMode.BLITZ]: 'blitz' }[input.mode] ?? 'classical',
      rounds: input.rounds,
      timeControl: input.timeControl,
      availableSlots: input.availableSlots,
      registrationFee: input.registrationFee,
      description: input.description,
      eloEligible: input.eloEligible,
      requirements: input.requirements,
      status: input.publishNow ? TournamentStatus.open : TournamentStatus.draft,
    },
  });
};

export const updateTournament = async (
  id: number,
  input: UpdateTournamentInput,
): Promise<Tournament> => {
  return prisma.tournament.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.venue !== undefined && { venue: input.venue }),
      ...(input.latitude !== undefined && { latitude: input.latitude }),
      ...(input.longitude !== undefined && { longitude: input.longitude }),
      ...(input.notificationRadius !== undefined && { notificationRadius: input.notificationRadius }),
      ...(input.geoNotificationActive !== undefined && { geoNotificationActive: input.geoNotificationActive }),
      ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
      ...(input.endDate !== undefined && { endDate: new Date(input.endDate) }),
      ...(input.format !== undefined && { format: input.format }),
      ...(input.rounds !== undefined && { rounds: input.rounds }),
      ...(input.timeControl !== undefined && { timeControl: input.timeControl }),
      ...(input.availableSlots !== undefined && { availableSlots: input.availableSlots }),
      ...(input.registrationFee !== undefined && { registrationFee: input.registrationFee }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.eloEligible !== undefined && { eloEligible: input.eloEligible }),
      ...(input.requirements !== undefined && { requirements: input.requirements }),
    },
  });
};

export const deleteTournament = async (id: number): Promise<void> => {
  await prisma.tournament.delete({ where: { id } });
};

export const findClubById = async (
  clubId: number,
): Promise<{ id: number; planActivo: boolean } | null> => {
  return prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, planActivo: true },
  });
};

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const findPlayersInRadius = async (
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<Array<{ userId: number }>> => {
  const players = await prisma.player.findMany({
    where: {
      lastLatitude: { not: null },
      lastLongitude: { not: null },
    },
    select: { userId: true, lastLatitude: true, lastLongitude: true },
  });

  return players.filter(
    (p) => haversineKm(lat, lng, p.lastLatitude!, p.lastLongitude!) <= radiusKm,
  );
};

export const findNearbyTournaments = async (
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<TournamentWithRelations[]> => {
  const candidates = await prisma.tournament.findMany({
    where: {
      geoNotificationActive: true,
      status: TournamentStatus.open,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: tournamentSelect,
  });

  return candidates.filter(
    (t) => haversineKm(lat, lng, t.latitude!, t.longitude!) <= radiusKm,
  );
};

export const findConfirmedRegistrationsByTournament = async (
  tournamentId: number,
): Promise<Array<{ playerId: number }>> => {
  const registrations = await prisma.registration.findMany({
    where: {
      tournamentId,
      status: RegistrationStatus.confirmed,
    },
    select: { playerId: true },
  });
  return registrations;
};

export const findGamesByTournamentAndRound = async (
  tournamentId: number,
  roundNumber: number,
) => {
  return prisma.game.findMany({
    where: { tournamentId, roundNumber },
    select: { id: true },
  });
};

export const generateRandomPairings = async (
  tournamentId: number,
  roundNumber: number,
): Promise<Array<{ id: number; roundNumber: number; whitePlayerId: number; blackPlayerId: number }>> => {
  const existingGames = await findGamesByTournamentAndRound(tournamentId, roundNumber);
  if (existingGames.length > 0) {
    throw new Error('Esta ronda ya tiene emparejamientos publicados');
  }

  const registrations = await findConfirmedRegistrationsByTournament(tournamentId);
  const playerIds = registrations.map((r) => r.playerId);

  // Fisher-Yates shuffle
  for (let i = playerIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
  }

  const pairings: Array<{ tournamentId: number; roundNumber: number; whitePlayerId: number; blackPlayerId: number }> = [];
  for (let i = 0; i + 1 < playerIds.length; i += 2) {
    pairings.push({
      tournamentId,
      roundNumber,
      whitePlayerId: playerIds[i],
      blackPlayerId: playerIds[i + 1],
    });
  }

  if (pairings.length === 0) return [];

  await prisma.game.createMany({ data: pairings });

  const createdGames = await prisma.game.findMany({
    where: { tournamentId, roundNumber },
    select: { id: true, roundNumber: true, whitePlayerId: true, blackPlayerId: true },
  });

  return createdGames;
};

export const closeTournamentById = async (tournamentId: number): Promise<Tournament> => {
  return prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: TournamentStatus.finished },
  });
};

export const findNotifyRequests = async (
  tournamentId: number,
): Promise<Array<{ userId: number }>> => {
  return prisma.tournamentNotifyRequest.findMany({
    where: { tournamentId },
    select: { userId: true },
  });
};

export const createNotifyRequest = async (
  userId: number,
  tournamentId: number,
): Promise<{ userId: number; tournamentId: number }> => {
  return prisma.tournamentNotifyRequest.upsert({
    where: { userId_tournamentId: { userId, tournamentId } },
    create: { userId, tournamentId },
    update: {},
    select: { userId: true, tournamentId: true },
  });
};

export const deleteNotifyRequest = async (
  userId: number,
  tournamentId: number,
): Promise<void> => {
  await prisma.tournamentNotifyRequest.deleteMany({
    where: { userId, tournamentId },
  });
};

export const findNotifyRequest = async (
  userId: number,
  tournamentId: number,
): Promise<{ userId: number; tournamentId: number } | null> => {
  return prisma.tournamentNotifyRequest.findUnique({
    where: { userId_tournamentId: { userId, tournamentId } },
    select: { userId: true, tournamentId: true },
  });
};
