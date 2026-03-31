import { authResolvers } from "../../features/auth/auth.resolver";
import { userResolvers } from "../../features/user/user.resolver";
import { tournamentResolvers } from "../../features/tournament/tournament.resolver";

export const resolvers = {
    Query: {
        ...userResolvers.Query,
        ...tournamentResolvers.Query,
    },
    Mutation: {
        ...authResolvers.Mutation,
        ...userResolvers.Mutation,
        ...tournamentResolvers.Mutation,
    },
}