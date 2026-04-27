import { prisma } from '../../config/database';
import { GameResult, RegistrationStatus } from '@prisma/client';
import {
  gameSelect,
  tournamentResultSelect,
  type GameWithRelations,
  type TournamentResultWithRelations,
} from './game.types';

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

export const findTournamentById = async (
  id: number,
): Promise<{ id: number; name: string; eloEligible: boolean; organizerId: number; status: string } | null> => {
  return prisma.tournament.findUnique({
    where: { id },
    select: { id: true, name: true, eloEligible: true, organizerId: true, status: true },
  });
};

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

export const createGame = async (data: {
  tournamentId: number;
  roundNumber: number;
  whitePlayerId: number;
  blackPlayerId: number;
  eloEligible: boolean;
}): Promise<GameWithRelations> => {
  const game = await prisma.game.create({ data });
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
