import { GraphQLError } from 'graphql';
import type { Context } from '../../common/context.types';
import * as tournamentService from './tournament.service';
import type {
  CreateTournamentInput,
  TournamentFiltersInput,
  UpdateTournamentInput,
} from './tournament.types';

export const tournamentResolvers = {
  Query: {
    tournaments: (
      _: unknown,
      { filters }: { filters?: TournamentFiltersInput },
      _ctx: Context,
    ) => tournamentService.getTournaments(filters ?? {}),

    tournament: (
      _: unknown,
      { id }: { id: string },
      _ctx: Context,
    ) => tournamentService.getTournamentById(Number(id)),

    nearbyTournaments: (
      _: unknown,
      { lat, lng, radiusKm }: { lat: number; lng: number; radiusKm: number },
      _ctx: Context,
    ) => tournamentService.getNearbyTournaments(lat, lng, radiusKm),
  },

  Mutation: {
    createTournament: (
      _: unknown,
      { input }: { input: CreateTournamentInput },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return tournamentService.createTournament(input, context.user.id);
    },

    updateTournament: (
      _: unknown,
      { id, input }: { id: string; input: UpdateTournamentInput },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return tournamentService.updateTournament(Number(id), input, context.user.id);
    },

    deleteTournament: (
      _: unknown,
      { id }: { id: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return tournamentService.deleteTournament(Number(id), context.user.id);
    },

    registerTournament: (
      _: unknown,
      { tournamentId }: { tournamentId: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return tournamentService.registerTournament(Number(tournamentId), context.user.id);
    },

    cancelRegistration: (
      _: unknown,
      { registrationId }: { registrationId: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return tournamentService.cancelRegistration(Number(registrationId), context.user.id);
    },
  },
};
