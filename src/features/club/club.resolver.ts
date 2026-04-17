import { GraphQLError } from 'graphql';
import type { Context } from '../../common/context.types';
import * as clubService from './club.service';
import type { UpdateClubInput } from './club.types';

export const clubResolvers = {
  Query: {
    clubs: (
      _: unknown,
      { filters }: { filters?: { name?: string; community?: string } },
    ) => clubService.getClubs(filters),

    club: (
      _: unknown,
      { id }: { id: string },
      _ctx: Context,
    ) => clubService.getClub(Number(id)),

    myClub: (
      _: unknown,
      __: unknown,
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.getMyClub(context.user.id);
    },

    delegateDashboard: (
      _: unknown,
      __: unknown,
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.getDelegateDashboard(context.user.id);
    },

    pendingPayments: (
      _: unknown,
      { tournamentId }: { tournamentId?: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.getPendingPayments(context.user.id, tournamentId ?? undefined);
    },

    expiringLicenses: (
      _: unknown,
      { daysThreshold }: { daysThreshold?: number },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.getExpiringLicenses(context.user.id, daysThreshold ?? 30);
    },
  },

  Mutation: {
    updateClub: async (
      _: unknown,
      { input }: { input: UpdateClubInput },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      const club = await clubService.getMyClub(context.user.id);
      return clubService.updateClub(club.id, input, context.user.id);
    },

    addPlayerToClub: (
      _: unknown,
      { playerId }: { playerId: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.addPlayerToClub(Number(playerId), context.user.id);
    },

    removePlayerFromClub: (
      _: unknown,
      { playerId }: { playerId: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.removePlayerFromClub(Number(playerId), context.user.id);
    },

    validatePayment: (
      _: unknown,
      { paymentReceiptId }: { paymentReceiptId: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.validatePayment(Number(paymentReceiptId), context.user.id);
    },

    rejectPayment: (
      _: unknown,
      { paymentReceiptId, reason }: { paymentReceiptId: string; reason: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.rejectPayment(Number(paymentReceiptId), context.user.id, reason);
    },
  },
};
