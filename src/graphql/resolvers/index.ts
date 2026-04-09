import { authResolvers } from "../../features/auth/auth.resolver";
import { userResolvers } from "../../features/user/user.resolver";
import { tournamentResolvers } from "../../features/tournament/tournament.resolver";
import { notificationResolvers } from "../../features/notification/notification.resolver";

export const resolvers = {
    Query: {
        ...userResolvers.Query,
        ...tournamentResolvers.Query,
        ...notificationResolvers.Query,
    },
    Mutation: {
        ...authResolvers.Mutation,
        ...userResolvers.Mutation,
        ...tournamentResolvers.Mutation,
        ...notificationResolvers.Mutation,
    },
}