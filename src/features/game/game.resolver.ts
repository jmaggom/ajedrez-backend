import { GraphQLError } from 'graphql';
import type { Context } from '../../common/context.types';
import * as gameService from './game.service';
import type { CreateGameInput, GameResultInput, SubmitGameResultInput } from './game.types';

export const gameResolvers = {
  Query: {
    tournamentGames: (
      _: unknown,
      { tournamentId, roundNumber }: { tournamentId: string; roundNumber?: number },
      _ctx: Context,
    ) => gameService.getTournamentGames(Number(tournamentId), roundNumber ?? undefined),

    tournamentStandings: (
      _: unknown,
      { tournamentId }: { tournamentId: string },
      _ctx: Context,
    ) => gameService.getTournamentStandings(Number(tournamentId)),

    tournamentRounds: (
      _: unknown,
      { tournamentId }: { tournamentId: string },
      _ctx: Context,
    ) => gameService.getTournamentRounds(Number(tournamentId)),
  },

  Mutation: {
    createGame: (
      _: unknown,
      { input }: { input: CreateGameInput },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return gameService.createGame(input, context.user.id);
    },

    submitGameResult: (
      _: unknown,
      { input }: { input: { gameId: string; result: GameResultInput } },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      const typedInput: SubmitGameResultInput = {
        gameId: input.gameId,
        result: input.result,
      };
      return gameService.submitGameResult(typedInput, context.user.id);
    },

    publishPairings: (
      _: unknown,
      { tournamentId }: { tournamentId: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return gameService.publishPairings(Number(tournamentId), context.user.id);
    },

    closeTournament: (
      _: unknown,
      { tournamentId }: { tournamentId: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return gameService.closeTournament(Number(tournamentId), context.user.id);
    },
  },

  Game: {
    result: (parent: { result: string | null }) => {
      if (!parent.result) return null;
      const map: Record<string, string> = {
        white_wins: 'WHITE_WINS',
        black_wins: 'BLACK_WINS',
        draw: 'DRAW',
        bye: 'BYE',
      };
      return map[parent.result] ?? null;
    },
  },

  GamePlayer: {
    fullName: (parent: { user?: { fullName: string }; fullName?: string } | null) =>
      parent?.user?.fullName ?? parent?.fullName ?? null,
  },
};
