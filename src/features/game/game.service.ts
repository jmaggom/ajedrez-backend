import { GraphQLError } from 'graphql';
import { GameResult, NotificationType, Role } from '@prisma/client';
import * as gameModel from './game.model';
import { sendPushNotification } from '../../common/notification/notification.service';
import {
  type CreateGameInput,
  type GameWithRelations,
  type SubmitGameResultInput,
  type PlayerStats,
} from './game.types';
import { GAME_RESULT_MAP, WHITE_POINTS, BLACK_POINTS } from './game.constants';

const recalculateTournamentResults = async (tournamentId: number): Promise<void> => {
  const allGames = await gameModel.findGamesByTournament(tournamentId);
  const completedGames = allGames.filter((g): g is GameWithRelations & { result: GameResult } =>
    g.result !== null,
  );

  const statsMap = new Map<number, PlayerStats>();

  const getOrInit = (playerId: number): PlayerStats => {
    if (!statsMap.has(playerId)) {
      statsMap.set(playerId, {
        points: 0,
        winsAsWhite: 0,
        drawsAsWhite: 0,
        lossesAsWhite: 0,
        winsAsBlack: 0,
        drawsAsBlack: 0,
        lossesAsBlack: 0,
      });
    }
    return statsMap.get(playerId)!;
  };

  for (const game of completedGames) {
    const whiteStats = getOrInit(game.whitePlayerId);
    const blackStats = getOrInit(game.blackPlayerId);

    whiteStats.points += WHITE_POINTS[game.result];
    blackStats.points += BLACK_POINTS[game.result];

    if (game.result === GameResult.white_wins) {
      whiteStats.winsAsWhite += 1;
      blackStats.lossesAsBlack += 1;
    } else if (game.result === GameResult.black_wins) {
      whiteStats.lossesAsWhite += 1;
      blackStats.winsAsBlack += 1;
    } else {
      whiteStats.drawsAsWhite += 1;
      blackStats.drawsAsBlack += 1;
    }
  }

  await Promise.all(
    Array.from(statsMap.entries()).map(([playerId, stats]) =>
      gameModel.upsertTournamentResult({ playerId, tournamentId, ...stats }),
    ),
  );

  const orderedPlayerIds = Array.from(statsMap.entries())
    .sort(([, a], [, b]) => b.points - a.points)
    .map(([playerId]) => playerId);

  await gameModel.updateFinalPositions(tournamentId, orderedPlayerIds);
};

export const getTournamentGames = async (
  tournamentId: number,
  roundNumber?: number,
) => {
  return gameModel.findGamesByTournament(tournamentId, roundNumber);
};

export const getTournamentStandings = async (tournamentId: number) => {
  const tournament = await gameModel.findTournamentById(tournamentId);
  if (!tournament)
    throw new GraphQLError('Tournament not found', { extensions: { code: 'NOT_FOUND' } });

  const results = await gameModel.findTournamentResults(tournamentId);

  return {
    tournamentId: String(tournament.id),
    tournamentName: tournament.name,
    status: tournament.status,
    lastUpdated: new Date().toISOString(),
    entries: results.map((r, i) => ({
      position: r.finalPosition ?? i + 1,
      player: {
        id: String(r.player.id),
        fullName: r.player.user.fullName,
        fideId: r.player.fideId ?? null,
        elo: r.player.elo
          ? {
            fideClassical: r.player.elo.fideClassical,
            fadaClassical: r.player.elo.fadaClassical,
          }
          : null,
      },
      points: r.points,
      gamesPlayed:
        r.winsAsWhite +
        r.drawsAsWhite +
        r.lossesAsWhite +
        r.winsAsBlack +
        r.drawsAsBlack +
        r.lossesAsBlack,
      wins: r.winsAsWhite + r.winsAsBlack,
      draws: r.drawsAsWhite + r.drawsAsBlack,
      losses: r.lossesAsWhite + r.lossesAsBlack,
      performanceRating: r.performanceRating ?? null,
    })),
  };
};

export const createGame = async (input: CreateGameInput, userId: number) => {
  const tournament = await gameModel.findTournamentById(Number(input.tournamentId));
  if (!tournament)
    throw new GraphQLError('Tournament not found', { extensions: { code: 'NOT_FOUND' } });

  const user = await gameModel.findUserById(userId);
  if (!user)
    throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });

  if (user.role !== Role.referee && user.role !== Role.delegate)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  if (user.role === Role.delegate && user.clubId !== tournament.organizerId)
    throw new GraphQLError(
      'Solo el delegado del club organizador puede crear partidas',
      { extensions: { code: 'FORBIDDEN' } },
    );

  return gameModel.createGame({
    tournamentId: Number(input.tournamentId),
    roundNumber: input.roundNumber,
    whitePlayerId: Number(input.whitePlayerId),
    blackPlayerId: Number(input.blackPlayerId),
    eloEligible: tournament.eloEligible,
  });
};

export const submitGameResult = async (
  input: SubmitGameResultInput,
  userId: number,
): Promise<{ game: GameWithRelations; standings: Awaited<ReturnType<typeof getTournamentStandings>> }> => {
  const game = await gameModel.findGameById(Number(input.gameId));
  if (!game)
    throw new GraphQLError('Game not found', { extensions: { code: 'NOT_FOUND' } });

  const tournament = await gameModel.findTournamentById(game.tournamentId);
  if (!tournament)
    throw new GraphQLError('Tournament not found', { extensions: { code: 'NOT_FOUND' } });

  const user = await gameModel.findUserById(userId);
  if (!user)
    throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });

  if (tournament.eloEligible) {
    if (user.role !== Role.referee)
      throw new GraphQLError(
        'Este torneo es valedero ELO. Solo un árbitro puede registrar resultados',
        { extensions: { code: 'FORBIDDEN' } },
      );
  } else {
    const isReferee = user.role === Role.referee;
    const isOrganizerDelegate =
      user.role === Role.delegate && user.clubId === tournament.organizerId;
    if (!isReferee && !isOrganizerDelegate)
      throw new GraphQLError(
        'Solo el árbitro o el delegado del club organizador pueden registrar resultados',
        { extensions: { code: 'FORBIDDEN' } },
      );
  }

  const prismaResult = GAME_RESULT_MAP[input.result];
  const updatedGame = await gameModel.updateGameResult(Number(input.gameId), prismaResult, userId);

  await recalculateTournamentResults(game.tournamentId);

  const registrations = await gameModel.findConfirmedRegistrationsByTournament(game.tournamentId);
  await Promise.allSettled(
    registrations.map(({ player }) =>
      sendPushNotification({
        userId: player.userId,
        type: NotificationType.result,
        title: 'Resultados actualizados',
        message: `Se han registrado los resultados de la ronda ${game.roundNumber} en ${tournament.name}`,
        data: {
          tournamentId: String(game.tournamentId),
          roundNumber: String(game.roundNumber),
        },
      }),
    ),
  );

  const standings = await getTournamentStandings(game.tournamentId);

  return { game: updatedGame, standings };
};
