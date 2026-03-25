import { GraphQLError } from "graphql";
import { UpdateProfileInput, UserProfile } from "./user.types";
import { UserWithPlayer } from "./user.types";
import * as userModel from "./user.model";

const toUserProfile = (user: UserWithPlayer): UserProfile => ({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone ?? null,
    player: user.player
        ? {
            id: user.player.id,
            fideId: user.player.fideId ?? null,
            birthDate: user.player.birthDate,
            federation: user.player.federation ?? null,
            elo: user.player.elo
                ? {
                    fideClassical: user.player.elo.fideClassical,
                    fideRapid: user.player.elo.fideRapid,
                    fideBlitz: user.player.elo.fideBlitz,
                    fadaClassical: user.player.elo.fadaClassical,
                    fadaRapid: user.player.elo.fadaRapid,
                    fadaBlitz: user.player.elo.fadaBlitz,
                    onlineClassical: user.player.elo.onlineClassical,
                    onlineRapid: user.player.elo.onlineRapid,
                    onlineBlitz: user.player.elo.onlineBlitz,
                    fideClassicalGames: user.player.elo.fideClassicalGames,
                    fideRapidGames: user.player.elo.fideRapidGames,
                    fideBlitzGames: user.player.elo.fideBlitzGames,
                    fadaClassicalGames: user.player.elo.fadaClassicalGames,
                    fadaRapidGames: user.player.elo.fadaRapidGames,
                    fadaBlitzGames: user.player.elo.fadaBlitzGames,
                    onlineClassicalGames: user.player.elo.onlineClassicalGames,
                    onlineRapidGames: user.player.elo.onlineRapidGames,
                    onlineBlitzGames: user.player.elo.onlineBlitzGames,
                }
                : null,
            eloHistory: user.player.eloHistory.map((entry) => ({
                id: entry.id,
                source: entry.source,
                period: entry.period,
                classical: entry.classical,
                rapid: entry.rapid,
                blitz: entry.blitz,
                classicalGames: entry.classicalGames,
                rapidGames: entry.rapidGames,
                blitzGames: entry.blitzGames,
                updatedAt: entry.updatedAt,
            })),
        }
        : null,
});

export const getMe = async (userId: number): Promise<UserProfile> => {
    const user = await userModel.findUserById(userId);
    if (!user) {
        throw new GraphQLError("User not found", { extensions: { code: "NOT_FOUND" } });
    }
    return toUserProfile(user);
};

export const updateProfile = async (
    userId: number,
    input: UpdateProfileInput
): Promise<UserProfile> => {
    const { fullName, phone, fideId, birthDate } = input;

    if (!fullName && !phone && !fideId && !birthDate) {
        throw new GraphQLError("At least one field must be provided", {
            extensions: { code: "BAD_USER_INPUT" },
        });
    }

    const userData: Partial<{ fullName: string; phone: string }> = {};
    if (fullName !== undefined) userData.fullName = fullName;
    if (phone !== undefined) userData.phone = phone;

    const playerData: Partial<{ fideId: string; birthDate: Date }> = {};
    if (fideId !== undefined) playerData.fideId = fideId;
    if (birthDate !== undefined) playerData.birthDate = new Date(birthDate);

    if (Object.keys(playerData).length > 0) {
        const existing = await userModel.findUserById(userId);
        if (!existing?.player) {
            throw new GraphQLError("Player profile not found", { extensions: { code: "FORBIDDEN" } });
        }
    }

    const user = await userModel.updateUserProfile(userId, userData, playerData);
    return toUserProfile(user);
};
