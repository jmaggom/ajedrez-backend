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
  },
};
