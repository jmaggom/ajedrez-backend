import { GraphQLError } from 'graphql';
import { GameResult, NotificationType, Role } from '@prisma/client';
import * as gameModel from './game.model';
import { generateSwissPairings } from './game.pairings';
import { sendPushNotification } from '../../common/notification/notification.service';
import {
  type CreateGameInput,
  type ColorHistory,
  type GameWithRelations,
  type HistoricalMatchup,
  type PairingPlayerInput,
  type PublishPairingsPayload,
  type RoundPairing,
  type RoundPairingPlayer,
  type RoundStatus,
  type RoundSummary,
  type SubmitGameResultInput,
  type PlayerStats,
} from './game.types';
import { GAME_RESULT_MAP, WHITE_POINTS, BLACK_POINTS } from './game.constants';
import { closeTournamentInDb } from '../tournament/tournament.model';

// ── Helpers internos ──────────────────────────────────────────────────────────

const recalculateTournamentResults = async (tournamentId: number): Promise<void> => {
  const allGames = await gameModel.findGamesByTournament(tournamentId);
  const completedGames = allGames.filter(
    (g): g is GameWithRelations & { result: GameResult } => g.result !== null,
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
    if (game.isBye) {
      // BYE: 1 punto automático al jugador que descansa
      if (game.byePlayerId !== null) {
        getOrInit(game.byePlayerId).points += 1;
      }
      continue;
    }

    if (game.whitePlayerId === null || game.blackPlayerId === null) continue;

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
    } else if (game.result === GameResult.draw) {
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

const buildRoundPairingPlayer = (
  player: {
    id: number;
    fideId: string | null;
    user: { fullName: string };
    elo: { fideClassical: number; fadaClassical: number } | null;
  } | null,
): RoundPairingPlayer | null => {
  if (!player) return null;
  return {
    id: String(player.id),
    fullName: player.user.fullName,
    fideId: player.fideId ?? null,
    elo: player.elo
      ? { fideClassical: player.elo.fideClassical, fadaClassical: player.elo.fadaClassical }
      : null,
  };
};

const gameToRoundPairing = (game: GameWithRelations): RoundPairing => ({
  gameId: String(game.id),
  roundNumber: game.roundNumber,
  tableNumber: game.tableNumber ?? 0,
  isBye: game.isBye,
  result: game.result ?? null,
  whitePlayer: buildRoundPairingPlayer(game.whitePlayer),
  blackPlayer: buildRoundPairingPlayer(game.blackPlayer),
  byePlayer: buildRoundPairingPlayer(game.byePlayer),
});

// ── Queries públicas ──────────────────────────────────────────────────────────

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

export const getTournamentRounds = async (tournamentId: number): Promise<RoundSummary[]> => {
  const tournament = await gameModel.findTournamentById(tournamentId);
  if (!tournament)
    throw new GraphQLError('Tournament not found', { extensions: { code: 'NOT_FOUND' } });

  const allGames = await gameModel.findGamesByTournament(tournamentId);

  const gamesByRound = new Map<number, GameWithRelations[]>();
  for (const game of allGames) {
    const existing = gamesByRound.get(game.roundNumber) ?? [];
    existing.push(game);
    gamesByRound.set(game.roundNumber, existing);
  }

  const summaries: RoundSummary[] = [];
  for (let round = 1; round <= tournament.rounds; round++) {
    const roundGames = gamesByRound.get(round) ?? [];

    let status: RoundStatus;
    if (roundGames.length === 0) {
      status = 'PENDING_PAIRINGS';
    } else {
      const hasPendingResults = roundGames.some((g) => g.result === null && !g.isBye);
      status = hasPendingResults ? 'PAIRINGS_PUBLISHED' : 'RESULTS_COMPLETE';
    }

    summaries.push({
      roundNumber: round,
      status,
      pairings: roundGames.map(gameToRoundPairing),
    });
  }

  return summaries;
};

// ── Mutations ─────────────────────────────────────────────────────────────────

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

export const publishPairings = async (
  tournamentId: number,
  userId: number,
): Promise<PublishPairingsPayload> => {
  const tournament = await gameModel.findTournamentById(tournamentId);
  if (!tournament)
    throw new GraphQLError('Tournament not found', { extensions: { code: 'NOT_FOUND' } });

  const user = await gameModel.findUserById(userId);
  if (!user)
    throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });

  const isReferee = user.role === Role.referee;
  const isOrganizerDelegate =
    user.role === Role.delegate && user.clubId === tournament.organizerId;

  if (!isReferee && !isOrganizerDelegate)
    throw new GraphQLError(
      'Solo el árbitro o el delegado del club organizador pueden publicar emparejamientos',
      { extensions: { code: 'FORBIDDEN' } },
    );

  const nextRound = tournament.currentRound + 1;

  if (nextRound > tournament.rounds)
    throw new GraphQLError(
      `El torneo solo tiene ${tournament.rounds} rondas`,
      { extensions: { code: 'BAD_USER_INPUT' } },
    );

  // Verificar que la ronda anterior está completa
  if (nextRound > 1) {
    const pending = await gameModel.countPendingResultsInRound(tournamentId, nextRound - 1);
    if (pending > 0)
      throw new GraphQLError(
        `Hay ${pending} resultado(s) pendiente(s) en la ronda ${nextRound - 1}`,
        { extensions: { code: 'PENDING_RESULTS' } },
      );
  }

  // Cargar jugadores inscritos con ELO
  const players = await gameModel.findConfirmedPlayersWithElo(tournamentId);
  if (players.length < 2)
    throw new GraphQLError(
      'Se necesitan al menos 2 jugadores para generar emparejamientos',
      { extensions: { code: 'BAD_USER_INPUT' } },
    );

  // Cargar historial de partidas anteriores para evitar rematches y balancear colores
  const previousGames = await gameModel.findGamesByTournament(tournamentId);
  const previousMatchups: HistoricalMatchup[] = previousGames
    .filter((g) => !g.isBye && g.whitePlayerId !== null && g.blackPlayerId !== null)
    .map((g) => ({
      playerAId: g.whitePlayerId!,
      playerBId: g.blackPlayerId!,
    }));

  // Calcular historial de colores por jugador
  const colorHistory = new Map<number, ColorHistory>();
  for (const game of previousGames) {
    if (game.isBye || game.whitePlayerId === null || game.blackPlayerId === null) continue;
    const whiteH = colorHistory.get(game.whitePlayerId) ?? { whites: 0, blacks: 0 };
    whiteH.whites += 1;
    colorHistory.set(game.whitePlayerId, whiteH);

    const blackH = colorHistory.get(game.blackPlayerId) ?? { whites: 0, blacks: 0 };
    blackH.blacks += 1;
    colorHistory.set(game.blackPlayerId, blackH);
  }

  // Obtener puntos actuales para el algoritmo suizo
  const results = await gameModel.findTournamentResults(tournamentId);
  const pointsMap = new Map<number, number>();
  for (const r of results) {
    pointsMap.set(r.playerId, r.points);
  }

  const pairingInputs: PairingPlayerInput[] = players.map((p) => ({
    playerId: p.playerId,
    fideClassical: p.fideClassical,
    points: pointsMap.get(p.playerId) ?? 0,
  }));

  const pairings = generateSwissPairings(pairingInputs, previousMatchups, nextRound, colorHistory);

  // Crear partidas en BD
  const createdGames = await Promise.all(
    pairings.map(async (pairing) => {
      if (pairing.isBye) {
        const byeGame = await gameModel.createByeGame({
          tournamentId,
          roundNumber: nextRound,
          byePlayerId: pairing.byePlayerId,
          tableNumber: pairing.tableNumber,
        });

        // Upsert TournamentResult con 1 punto automático para el jugador con BYE
        const currentPoints = pointsMap.get(pairing.byePlayerId) ?? 0;
        const currentStats = results.find((r) => r.playerId === pairing.byePlayerId);
        await gameModel.upsertTournamentResult({
          playerId: pairing.byePlayerId,
          tournamentId,
          points: currentPoints + 1,
          winsAsWhite: currentStats?.winsAsWhite ?? 0,
          drawsAsWhite: currentStats?.drawsAsWhite ?? 0,
          lossesAsWhite: currentStats?.lossesAsWhite ?? 0,
          winsAsBlack: currentStats?.winsAsBlack ?? 0,
          drawsAsBlack: currentStats?.drawsAsBlack ?? 0,
          lossesAsBlack: currentStats?.lossesAsBlack ?? 0,
        });

        return byeGame;
      } else {
        return gameModel.createGame({
          tournamentId,
          roundNumber: nextRound,
          whitePlayerId: pairing.whitePlayerId,
          blackPlayerId: pairing.blackPlayerId,
          tableNumber: pairing.tableNumber,
          eloEligible: tournament.eloEligible,
        });
      }
    })
  );

  // Actualizar currentRound
  await gameModel.updateTournamentCurrentRound(tournamentId, nextRound);

  // Notificar a los jugadores
  const playerMap = new Map(players.map((p) => [p.playerId, p]));

  await Promise.allSettled(
    pairings.flatMap((pairing) => {
      if (pairing.isBye) {
        const byePlayer = playerMap.get(pairing.byePlayerId);
        if (!byePlayer) return [];
        return [
          sendPushNotification({
            userId: byePlayer.userId,
            type: NotificationType.tournament,
            title: 'Emparejamientos publicados',
            message: `Descansás en la Ronda ${nextRound} (+1 punto)`,
            data: { tournamentId: String(tournamentId) },
          }),
        ];
      }

      const whitePlayer = playerMap.get(pairing.whitePlayerId);
      const blackPlayer = playerMap.get(pairing.blackPlayerId);
      const notifications = [];

      if (whitePlayer && blackPlayer) {
        notifications.push(
          sendPushNotification({
            userId: whitePlayer.userId,
            type: NotificationType.tournament,
            title: 'Emparejamientos publicados',
            message: `Mesa ${pairing.tableNumber}, Ronda ${nextRound}: jugás con BLANCAS contra ${blackPlayer.fullName}`,
            data: { tournamentId: String(tournamentId) },
          }),
          sendPushNotification({
            userId: blackPlayer.userId,
            type: NotificationType.tournament,
            title: 'Emparejamientos publicados',
            message: `Mesa ${pairing.tableNumber}, Ronda ${nextRound}: jugás con NEGRAS contra ${whitePlayer.fullName}`,
            data: { tournamentId: String(tournamentId) },
          }),
        );
      }

      return notifications;
    }),
  );

  return {
    roundNumber: nextRound,
    pairings: createdGames.map(gameToRoundPairing),
  };
};

export const closeTournament = async (
  tournamentId: number,
  userId: number,
): Promise<{
  tournament: Awaited<ReturnType<typeof import('../tournament/tournament.model').closeTournamentInDb>>;
  finalStandings: Awaited<ReturnType<typeof getTournamentStandings>>;
}> => {
  const tournament = await gameModel.findTournamentById(tournamentId);
  if (!tournament)
    throw new GraphQLError('Tournament not found', { extensions: { code: 'NOT_FOUND' } });

  if (tournament.status === 'finished')
    throw new GraphQLError('El torneo ya está cerrado', { extensions: { code: 'CONFLICT' } });

  const user = await gameModel.findUserById(userId);
  if (!user)
    throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });

  const isReferee = user.role === Role.referee;
  const isOrganizerDelegate =
    user.role === Role.delegate && user.clubId === tournament.organizerId;

  if (!isReferee && !isOrganizerDelegate)
    throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });

  const finalStandings = await getTournamentStandings(tournamentId);
  const closedTournament = await closeTournamentInDb(tournamentId);

  const registrations = await gameModel.findConfirmedRegistrationsByTournament(tournamentId);
  await Promise.allSettled(
    registrations.map(({ player }) =>
      sendPushNotification({
        userId: player.userId,
        type: NotificationType.tournament,
        title: 'Torneo finalizado',
        message: `El torneo ${tournament.name} ha finalizado. Clasificación disponible`,
        data: { tournamentId: String(tournamentId) },
      }),
    ),
  );

  return { tournament: closedTournament, finalStandings };
};
