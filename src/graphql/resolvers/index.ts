import { authResolvers } from "../../features/auth/auth.resolver";
import { userResolvers } from "../../features/user/user.resolver";
import { tournamentResolvers } from "../../features/tournament/tournament.resolver";
import { clubResolvers } from "../../features/club/club.resolver";
import { notificationResolvers } from "../../features/notification/notification.resolver";

export const resolvers = {
    Query: {
        ...userResolvers.Query,
        ...tournamentResolvers.Query,
        ...clubResolvers.Query,
        ...notificationResolvers.Query,
    },
    Mutation: {
        ...authResolvers.Mutation,
        ...userResolvers.Mutation,
        ...tournamentResolvers.Mutation,
        ...clubResolvers.Mutation,
        ...notificationResolvers.Mutation,
    },
    Tournament: tournamentResolvers.Tournament,
    Registration: tournamentResolvers.Registration,
}