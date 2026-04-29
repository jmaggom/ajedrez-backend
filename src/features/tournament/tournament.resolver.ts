import { GraphQLError } from 'graphql';
import type { Context } from '../../common/context.types';
import * as tournamentService from './tournament.service';
import type {
  CreateTournamentInput,
  TournamentFiltersInput,
  UpdateTournamentInput,
} from './tournament.types';

export const tournamentResolvers = {
  Tournament: {
    status: (parent: { status: string }) => parent.status.toUpperCase(),
    mode: (parent: { mode: string }) => parent.mode.toUpperCase(),
    requirements: (parent: { requirements: Record<string, unknown> }) => ({
      requireFideId: parent.requirements?.requireFideId ?? false,
      requireFadaId: parent.requirements?.requireFadaId ?? false,
      eloFilter: parent.requirements?.eloFilter ?? null,
    }),
  },
  Registration: {
    status: (parent: { status: string }) => parent.status.toUpperCase(),
    paymentStatus: (parent: { paymentStatus: string }) => parent.paymentStatus.toUpperCase(),
  },
  Query: {
    tournaments: (
      _: unknown,
      { filters, page, limit }: { filters?: TournamentFiltersInput; page?: number; limit?: number },
      _ctx: Context,
    ) => tournamentService.getTournaments({ ...filters, page, limit }),

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
