import { authResolvers } from "./auth";

export const resolvers = {
    Mutation: {
        ...authResolvers.Mutation,
    }
}