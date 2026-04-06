import { authTypeDefs } from "../../features/auth/auth.schema";
import { userTypeDefs } from "../../features/user/user.schema";
import { tournamentTypeDefs } from "../../features/tournament/tournament.schema";

export const typeDefs = [authTypeDefs, userTypeDefs, tournamentTypeDefs];
