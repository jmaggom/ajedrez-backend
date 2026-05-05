import { authResolvers } from "../../features/auth/auth.resolver";
import { userResolvers } from "../../features/user/user.resolver";
import { tournamentResolvers } from "../../features/tournament/tournament.resolver";
import { clubResolvers } from "../../features/club/club.resolver";
import { gameResolvers } from "../../features/game/game.resolver";
import { paymentResolvers } from "../../features/payment/payment.resolver";
import { notificationResolvers } from "../../features/notification/notification.resolver";

export const resolvers = {
    Query: {
        ...userResolvers.Query,
        ...tournamentResolvers.Query,
        ...clubResolvers.Query,
        ...gameResolvers.Query,
        ...paymentResolvers.Query,
        ...notificationResolvers.Query,
    },
    Mutation: {
        ...authResolvers.Mutation,
        ...userResolvers.Mutation,
        ...tournamentResolvers.Mutation,
        ...clubResolvers.Mutation,
        ...gameResolvers.Mutation,
        ...paymentResolvers.Mutation,
        ...notificationResolvers.Mutation,
    },
    Tournament: tournamentResolvers.Tournament,
    Registration: tournamentResolvers.Registration,
    PlayerProfile: tournamentResolvers.PlayerProfile,
    Club: clubResolvers.Club,
    PendingPaymentRegistration: clubResolvers.PendingPaymentRegistration,
    PaymentReceipt: paymentResolvers.PaymentReceipt,
    Notification: notificationResolvers.Notification,
}