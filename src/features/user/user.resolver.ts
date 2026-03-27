import { GraphQLError } from "graphql";
import { Context } from "../../common/context.types";
import { UpdateProfileInput } from "./user.types";
import * as userService from "./user.service";

export const userResolvers = {
    Query: {
        me: (_: unknown, __: unknown, ctx: Context) => {
            if (!ctx.user) {
                throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHENTICATED" } });
            }
            return userService.getMe(ctx.user.id);
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
    },
};
