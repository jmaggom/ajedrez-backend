import { GraphQLError } from 'graphql';
import type { Context } from '../../common/context.types';
import * as clubService from './club.service';
import type { UpdateClubInput } from './club.types';

export const clubResolvers = {
  Club: {
    delegates: (parent: { delegates: Array<{ id: number; userId: number; user: { email: string; fullName: string; phone: string | null } }> }) =>
      parent.delegates.map((d) => ({
        id: d.userId,
        fullName: d.user.fullName,
        email: d.user.email,
        phone: d.user.phone ?? null,
      })),
  },

  Query: {
    clubs: (
      _: unknown,
      { filters, page, limit }: { filters?: { name?: string; community?: string }; page?: number; limit?: number },
    ) => clubService.getClubs({ filters, page, limit }),

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

    clubPlayers: (
      _: unknown,
      { clubId, search, page, limit }: { clubId: string; search?: string; page?: number; limit?: number },
    ) => clubService.getClubPlayers({
      clubId,
      search: search ?? undefined,
      page: page ?? 1,
      limit: limit ?? 10,
    }),

    searchUserByEmail: (
      _: unknown,
      { email }: { email: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.searchUserByEmail(email, context.user.id);
    },

    recentRegistrations: async (
      _: unknown,
      { page, limit }: { page?: number; limit?: number },
      context: Context,
    ) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }
      return clubService.getRecentRegistrations(
        context.user.id,
        page ?? 1,
        limit ?? 10,
      );
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

    addDelegate: (
      _: unknown,
      { clubId, userEmail }: { clubId: string; userEmail: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.addDelegate(Number(clubId), userEmail, context.user.id);
    },

    removeDelegate: (
      _: unknown,
      { clubId, delegateId }: { clubId: string; delegateId: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.removeDelegate(Number(clubId), Number(delegateId), context.user.id);
    },

    getClubLogoUploadUrl: (
      _: unknown,
      { clubId, fileName, mimeType }: { clubId: string; fileName: string; mimeType: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.getClubLogoUploadUrl(Number(clubId), fileName, mimeType, context.user.id);
    },

    confirmClubLogoUpload: (
      _: unknown,
      { clubId, path }: { clubId: string; path: string },
      context: Context,
    ) => {
      if (!context.user)
        throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      return clubService.confirmClubLogoUpload(Number(clubId), path, context.user.id);
    },
  },
};
