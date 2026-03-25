import { authResolvers } from "../../features/auth/auth.resolver";
import { userResolvers } from "../../features/user/user.resolver";

export const resolvers = {
    Query: {
        ...userResolvers.Query,
    },
    Mutation: {
        ...authResolvers.Mutation,
        ...userResolvers.Mutation,
    },
}