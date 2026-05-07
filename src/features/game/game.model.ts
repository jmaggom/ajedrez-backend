import { prisma } from '../../config/database';
import { GameResult, RegistrationStatus, TournamentStatus } from '@prisma/client';
import {
  gameSelect,
  tournamentResultSelect,
  type GameWithRelations,
  type TournamentResultWithRelations,
} from './game.types';

// ── Torneos ───────────────────────────────────────────────────────────────────

export const findTournamentById = async (id: number) => {
  return prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      eloEligible: true,
      organizerId: true,
      status: true,
      rounds: true,
      currentRound: true,
    },
  });
};

export const updateTournamentCurrentRound = async (
  tournamentId: number,
  currentRound: number,
): Promise<void> => {
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { currentRound },
  });
};

export const closeTournamentInDb = async (tournamentId: number) => {
  return prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: TournamentStatus.finished },
    select: {
      id: true,
      name: true,
      status: true,
      rounds: true,
      currentRound: true,
      startDate: true,
      endDate: true,
      venue: true,
      organizerId: true,
      eloEligible: true,
      mode: true,
      timeControl: true,
      availableSlots: true,
      registrationFee: true,
      description: true,
      format: true,
      requirements: true,
      latitude: true,
      longitude: true,
      notificationRadius: true,
      geoNotificationActive: true,
    },
  });
};

// ── Usuarios ──────────────────────────────────────────────────────────────────

export const findUserById = async (
  id: number,
): Promise<{ id: number; role: string; clubId: number | null } | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      delegate: { select: { clubId: true } },
      player: { select: { clubId: true } },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    role: user.role,
    clubId: user.delegate?.clubId ?? user.player?.clubId ?? null,
  };
};

// ── Partidas ──────────────────────────────────────────────────────────────────

export const findGameById = async (id: number): Promise<GameWithRelations | null> => {
  return prisma.game.findUnique({ where: { id }, select: gameSelect });
};

export const findGamesByTournament = async (
  tournamentId: number,
  roundNumber?: number,
): Promise<GameWithRelations[]> => {
  return prisma.game.findMany({
    where: {
      tournamentId,
      ...(roundNumber !== undefined && { roundNumber }),
    },
    select: gameSelect,
    orderBy: { roundNumber: 'asc' },
  });
};

export const createGame = async (data: {
  tournamentId: number;
  roundNumber: number;
  whitePlayerId: number;
  blackPlayerId: number;
  tableNumber?: number;
  eloEligible: boolean;
}): Promise<GameWithRelations> => {
  const game = await prisma.game.create({ data });
  return prisma.game.findUniqueOrThrow({ where: { id: game.id }, select: gameSelect });
};

export const createByeGame = async (data: {
  tournamentId: number;
  roundNumber: number;
  byePlayerId: number;
  tableNumber: number;
}): Promise<GameWithRelations> => {
  const game = await prisma.game.create({
    data: {
      ...data,
      isBye: true,
      result: GameResult.bye,
      eloEligible: false,
    },
  });
  return prisma.game.findUniqueOrThrow({ where: { id: game.id }, select: gameSelect });
};

export const updateGameResult = async (
  gameId: number,
  result: GameResult,
  registeredById: number,
): Promise<GameWithRelations> => {
  await prisma.game.update({
    where: { id: gameId },
    data: { result, registeredById },
  });
  return prisma.game.findUniqueOrThrow({ where: { id: gameId }, select: gameSelect });
};

export const countPendingResultsInRound = async (
  tournamentId: number,
  roundNumber: number,
): Promise<number> => {
  return prisma.game.count({
    where: {
      tournamentId,
      roundNumber,
      result: null,
      isBye: false,
    },
  });
};

// ── Jugadores para emparejamiento ─────────────────────────────────────────────

export const findConfirmedPlayersWithElo = async (
  tournamentId: number,
): Promise<
  Array<{
    playerId: number;
    userId: number;
    fideClassical: number;
    fideId: string | null;
    fullName: string;
  }>
> => {
  const registrations = await prisma.registration.findMany({
    where: {
      tournamentId,
      status: { in: [RegistrationStatus.confirmed, RegistrationStatus.pending] },
    },
    select: {
      player: {
        select: {
          id: true,
          userId: true,
          fideId: true,
          elo: { select: { fideClassical: true } },
          user: { select: { fullName: true } },
        },
      },
    },
  });

  return registrations.map(({ player }) => ({
    playerId: player.id,
    userId: player.userId,
    fideClassical: player.elo.fideClassical,
    fideId: player.fideId,
    fullName: player.user.fullName,
  }));
};

// ── Resultados ────────────────────────────────────────────────────────────────

export const findTournamentResults = async (
  tournamentId: number,
): Promise<TournamentResultWithRelations[]> => {
  return prisma.tournamentResult.findMany({
    where: { tournamentId },
    select: tournamentResultSelect,
    orderBy: [{ points: 'desc' }, { finalPosition: 'asc' }],
  });
};

export const upsertTournamentResult = async (data: {
  playerId: number;
  tournamentId: number;
  points: number;
  winsAsWhite: number;
  drawsAsWhite: number;
  lossesAsWhite: number;
  winsAsBlack: number;
  drawsAsBlack: number;
  lossesAsBlack: number;
}): Promise<TournamentResultWithRelations> => {
  const { playerId, tournamentId, ...stats } = data;
  const result = await prisma.tournamentResult.upsert({
    where: { playerId_tournamentId: { playerId, tournamentId } },
    create: { playerId, tournamentId, finalPosition: 0, ...stats },
    update: stats,
  });
  return prisma.tournamentResult.findUniqueOrThrow({
    where: { id: result.id },
    select: tournamentResultSelect,
  });
};

export const updateFinalPositions = async (
  tournamentId: number,
  orderedPlayerIds: number[],
): Promise<void> => {
  await prisma.$transaction(
    orderedPlayerIds.map((playerId, index) =>
      prisma.tournamentResult.update({
        where: { playerId_tournamentId: { playerId, tournamentId } },
        data: { finalPosition: index + 1 },
      }),
    ),
  );
};

export const findConfirmedRegistrationsByTournament = async (
  tournamentId: number,
): Promise<{ player: { userId: number } }[]> => {
  return prisma.registration.findMany({
    where: {
      tournamentId,
      status: { in: [RegistrationStatus.confirmed, RegistrationStatus.pending] },
    },
    select: {
      player: {
        select: { userId: true },
      },
    },
  });
};
