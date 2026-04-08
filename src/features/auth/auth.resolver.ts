import { GraphQLError } from "graphql";
import { EmailLoginInput, RegisterPlayerInput, RegisterDelegateInput } from "./auth.types";
import { Context } from "../../common/context.types";
import * as authService from "./auth.service";

export const authResolvers = {
    Mutation: {
        emailLogin: (_: unknown, { input }: { input: EmailLoginInput }, _context: Context) =>
            authService.login(input),
        registerPlayer: (_: unknown, { input }: { input: RegisterPlayerInput }, _context: Context) =>
            authService.registerPlayer(input),
        registerDelegate: (_: unknown, { input }: { input: RegisterDelegateInput }, _context: Context) =>
            authService.registerDelegate(input),
        savePushToken: (_: unknown, { token }: { token: string }, context: Context) => {
            if (!context.user)
                throw new GraphQLError('Unauthenticated', { extensions: { code: 'UNAUTHENTICATED' } });
            return authService.savePushToken(context.user.id, token);
        },
    },
};
