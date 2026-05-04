import { GraphQLError } from "graphql";
import * as bcrypt from "bcryptjs";
import { UpdateProfileInput, GetAvatarUploadUrlInput, UserProfile, toUserRole, ChangePasswordInput } from "./user.types";
import { UserWithPlayer } from "./user.types";
import * as userModel from "./user.model";
import { fetchFidePlayerInfo } from "../../common/clients/chesstools.client";
import { FideHistoryEntry } from "../../common/clients/chesstools.types";
import {
    buildAvatarPath,
    getAvatarUploadUrl as storageGetAvatarUploadUrl,
    getAvatarPublicUrl,
    verifyFileExists,
    deleteFile,
} from "../../common/storage/storage.service";
import { ALLOWED_AVATAR_TYPES } from "../../common/storage/storage.constant";
import type { GetUploadUrlResult } from "../../common/storage/storage.types";

const toUserProfile = (user: UserWithPlayer): UserProfile => ({
    id: user.id,
    email: user.email,
    role: toUserRole(user.role),
    fullName: user.fullName,
    phone: user.phone ?? null,
    avatarUrl: user.avatarUrl ?? null,
    player: user.player
        ? {
            id: user.player.id,
            fideId: user.player.fideId ?? null,
            birthDate: user.player.birthDate,
            federation: user.player.federation ?? null,
            clubId: user.player.clubId ?? null,
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
            licenses: user.player.licenses.map((l) => ({
                id: l.id,
                type: l.type,
                status: l.status,
                expiresAt: l.expiresAt,
            })),
        }
        : null,
    delegate: user.delegate
        ? {
            id: user.delegate.id,
            clubId: user.delegate.clubId,
        }
        : null,
});

export const getAvatarUploadUrl = async (
    input: GetAvatarUploadUrlInput,
    userId: number,
): Promise<GetUploadUrlResult> => {
    if (!ALLOWED_AVATAR_TYPES.includes(input.mimeType))
        throw new GraphQLError('Tipo de archivo no permitido', {
            extensions: { code: 'BAD_USER_INPUT' },
        });

    const path = buildAvatarPath({ userId, fileName: input.fileName });
    const { uploadUrl, token } = await storageGetAvatarUploadUrl({ path });

    return { uploadUrl, token, path };
};

export const confirmAvatarUpload = async (
    path: string,
    userId: number,
): Promise<UserProfile> => {
    const fileExists = await verifyFileExists({ bucket: 'avatar', path });
    if (!fileExists)
        throw new GraphQLError('El archivo no se ha subido correctamente', {
            extensions: { code: 'BAD_USER_INPUT' },
        });

    const user = await userModel.findUserById(userId);
    if (!user)
        throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });

    if (user.avatarUrl) {
        const oldPath = user.avatarUrl.split('/storage/v1/object/public/avatar/')[1];
        if (oldPath) {
            await deleteFile({ bucket: 'avatar', path: oldPath }).catch(() => { });
        }
    }

    const publicUrl = getAvatarPublicUrl(path);
    await userModel.updateUserAvatarUrl(userId, publicUrl);

    const updated = await userModel.findUserById(userId);
    if (!updated)
        throw new GraphQLError('User not found after avatar update', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });

    return toUserProfile(updated);
};

export const getMyTournamentHistory = async (userId: number) => {
    return userModel.findTournamentHistoryByUserId(userId);
};

export const getMe = async (userId: number): Promise<UserProfile> => {
    const user = await userModel.findUserById(userId);
    if (!user) {
        throw new GraphQLError("User not found", { extensions: { code: "UNAUTHENTICATED" } });
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
    if (birthDate !== undefined) {
        const parsed = new Date(birthDate);
        if (isNaN(parsed.getTime())) {
            throw new GraphQLError("Invalid birthDate format", { extensions: { code: "BAD_USER_INPUT" } });
        }
        playerData.birthDate = parsed;
    }

    if (Object.keys(playerData).length > 0) {
        const existing = await userModel.findUserById(userId);
        if (!existing?.player) {
            throw new GraphQLError("Player profile not found", { extensions: { code: "FORBIDDEN" } });
        }
    }

    const user = await userModel.updateUserProfile(userId, userData, playerData);
    return toUserProfile(user);
};

export const syncFideData = async (userId: number): Promise<UserProfile> => {
    const user = await userModel.findUserById(userId);
    if (!user) {
        throw new GraphQLError("User not found", { extensions: { code: "NOT_FOUND" } });
    }
    if (!user.player) {
        throw new GraphQLError("Player profile not found", { extensions: { code: "FORBIDDEN" } });
    }
    if (!user.player.fideId) {
        throw new GraphQLError("No FIDE ID configured for this player", {
            extensions: { code: "BAD_USER_INPUT" },
        });
    }

    let fideData;
    try {
        fideData = await fetchFidePlayerInfo(user.player.fideId);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "";
        if (message === "FIDE_NOT_FOUND") {
            throw new GraphQLError("FIDE player not found", { extensions: { code: "NOT_FOUND" } });
        }
        throw new GraphQLError("Failed to fetch FIDE data", {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
    }

    // The latest entry in the history has the current ratings
    const sorted = [...fideData.history].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];

    const historyEntries = sorted.map((entry: FideHistoryEntry) => ({
        period: entry.date,
        classical: entry.classical_rating,
        rapid: entry.rapid_rating,
        blitz: entry.blitz_rating,
        classicalGames: entry.classical_games,
        rapidGames: entry.rapid_games,
        blitzGames: entry.blitz_games,
    }));

    await userModel.syncPlayerFideData(userId, {
        fullName: fideData.name,
        federation: fideData.federation,
        elo: {
            fideClassical: latest?.classical_rating ?? 0,
            fideRapid: latest?.rapid_rating ?? 0,
            fideBlitz: latest?.blitz_rating ?? 0,
            fideClassicalGames: latest?.classical_games ?? 0,
            fideRapidGames: latest?.rapid_games ?? 0,
            fideBlitzGames: latest?.blitz_games ?? 0,
        },
        historyEntries,
    });

    const updatedUser = await userModel.findUserById(userId);
    if (!updatedUser) {
        throw new GraphQLError("User not found after sync", { extensions: { code: "INTERNAL_SERVER_ERROR" } });
    }
    return toUserProfile(updatedUser);
};

export const changePassword = async (
    userId: number,
    input: ChangePasswordInput
): Promise<boolean> => {
    const user = await userModel.findUserPasswordById(userId);
    if (!user)
        throw new GraphQLError("User not found", { extensions: { code: "NOT_FOUND" } });

    const isMatch = await bcrypt.compare(input.currentPassword, user.password);
    if (!isMatch)
        throw new GraphQLError("La contraseña actual es incorrecta", { extensions: { code: "BAD_USER_INPUT" } });

    const hash = await bcrypt.hash(input.newPassword, 10);
    await userModel.updateUserPassword(userId, hash);
    return true;
};
