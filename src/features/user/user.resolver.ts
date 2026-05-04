import { GraphQLError } from "graphql";
import { Context } from "../../common/context.types";
import { UpdateProfileInput, GetAvatarUploadUrlInput, ChangePasswordInput } from "./user.types";
import * as userService from "./user.service";

export const userResolvers = {
    Query: {
        me: (_: unknown, __: unknown, ctx: Context) => {
            if (!ctx.user)
                throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHENTICATED" } });
            return userService.getMe(ctx.user.id);
        },
        myTournamentHistory: (_: unknown, __: unknown, ctx: Context) => {
            if (!ctx.user)
                throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHENTICATED" } });
            return userService.getMyTournamentHistory(ctx.user.id);
        },
    },
    Mutation: {
        updateProfile: (_: unknown, { input }: { input: UpdateProfileInput }, ctx: Context) => {
            if (!ctx.user) {
                throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHENTICATED" } });
            }
            return userService.updateProfile(ctx.user.id, input);
        },
        syncFideData: (_: unknown, __: unknown, ctx: Context) => {
            if (!ctx.user) {
                throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHENTICATED" } });
            }
            return userService.syncFideData(ctx.user.id);
        },
        getAvatarUploadUrl: (_: unknown, { input }: { input: GetAvatarUploadUrlInput }, ctx: Context) => {
            if (!ctx.user)
                throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
            return userService.getAvatarUploadUrl(input, ctx.user.id);
        },
        confirmAvatarUpload: (_: unknown, { path }: { path: string }, ctx: Context) => {
            if (!ctx.user)
                throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHENTICATED' } });
            return userService.confirmAvatarUpload(path, ctx.user.id);
        },
        changePassword: (_: unknown, { input }: { input: ChangePasswordInput }, ctx: Context) => {
            if (!ctx.user)
                throw new GraphQLError("Unauthenticated", { extensions: { code: "UNAUTHENTICATED" } });
            return userService.changePassword(ctx.user.id, input);
        },
    },
};
