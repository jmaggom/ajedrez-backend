import { authResolvers } from "../../features/auth/auth.resolver";

export const resolvers = {
    Mutation: {
        ...authResolvers.Mutation,
    }
}