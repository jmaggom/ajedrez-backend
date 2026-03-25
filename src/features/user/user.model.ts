import { prisma } from "../../config/database";
import { UserWithPlayer } from "./user.types";

const playerSelect = {
    id: true,
    fideId: true,
    userId: true,
    birthDate: true,
    NIF: true,
    clubId: true,
    eloId: true,
    joinedAt: true,
    leftAt: true,
};

export const findUserById = async (id: number): Promise<UserWithPlayer | null> => {
    return prisma.user.findUnique({
        where: { id },
        include: { player: { select: playerSelect } },
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
            include: { player: { select: playerSelect } },
        });
    }

    return prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: userId }, data: userData });
        await tx.player.update({ where: { userId }, data: playerData });
        return tx.user.findUniqueOrThrow({
            where: { id: userId },
            include: { player: { select: playerSelect } },
        });
    });
};
