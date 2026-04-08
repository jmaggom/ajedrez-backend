import { authTypeDefs } from "../../features/auth/auth.schema";
import { userTypeDefs } from "../../features/user/user.schema";
import { tournamentTypeDefs } from "../../features/tournament/tournament.schema";
import { clubTypeDefs } from "../../features/club/club.chema";

export const typeDefs = [authTypeDefs, userTypeDefs, tournamentTypeDefs, clubTypeDefs];
