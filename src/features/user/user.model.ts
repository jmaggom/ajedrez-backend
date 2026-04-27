import { EloSource } from "@prisma/client";
import { prisma } from "../../config/database";
import { playerSelect, delegateSelect, SyncPlayerFideDataInput, UserWithPlayer } from "./user.types";


export const findUserById = async (id: number): Promise<UserWithPlayer | null> => {
    return prisma.user.findUnique({
        where: { id },
        include: {
            player: { select: playerSelect },
            delegate: { select: delegateSelect },
        },
    });
};

export const updateUserAvatarUrl = async (
    userId: number,
    avatarUrl: string,
): Promise<UserWithPlayer> => {
    return prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
        include: {
            player: { select: playerSelect },
            delegate: { select: delegateSelect },
        },
    });
};

export const updateUserProfile = async (
    userId: number,
    userData: Partial<{ fullName: string; phone: string }>,
    playerData: Partial<{ fideId: string; birthDate: Date }>
): Promise<UserWithPlayer> => {
    const hasPlayerData = Object.keys(playerData).length > 0;

    if (!hasPlayerData) {
        return prisma.user.update({
            where: { id: userId },
            data: userData,
            include: {
                player: { select: playerSelect },
                delegate: { select: delegateSelect },
            },
        });
    }

    return prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: userId }, data: userData });
        await tx.player.update({ where: { userId }, data: playerData });
        return tx.user.findUniqueOrThrow({
            where: { id: userId },
            include: {
                player: { select: playerSelect },
                delegate: { select: delegateSelect },
            },
        });
    });
};

export const syncPlayerFideData = async (
    userId: number,
    data: SyncPlayerFideDataInput
): Promise<UserWithPlayer> => {
    return prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: { fullName: data.fullName },
        });

        const player = await tx.player.update({
            where: { userId },
            data: { federation: data.federation },
            select: { id: true, eloId: true },
        });

        await tx.elo.update({
            where: { id: player.eloId },
            data: data.elo,
        });

        for (const entry of data.historyEntries) {
            await tx.eloHistory.upsert({
                where: {
                    playerId_source_period: {
                        playerId: player.id,
                        source: EloSource.fide_api,
                        period: entry.period,
                    },
                },
                create: {
                    playerId: player.id,
                    source: EloSource.fide_api,
                    period: entry.period,
                    classical: entry.classical,
                    rapid: entry.rapid,
                    blitz: entry.blitz,
                    classicalGames: entry.classicalGames,
                    rapidGames: entry.rapidGames,
                    blitzGames: entry.blitzGames,
                },
                update: {
                    classical: entry.classical,
                    rapid: entry.rapid,
                    blitz: entry.blitz,
                    classicalGames: entry.classicalGames,
                    rapidGames: entry.rapidGames,
                    blitzGames: entry.blitzGames,
                },
            });
        }

        return tx.user.findUniqueOrThrow({
            where: { id: userId },
            include: {
                player: { select: playerSelect },
                delegate: { select: delegateSelect },
            },
        });
    });
};
