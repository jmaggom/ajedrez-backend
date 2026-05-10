import { prisma } from "../../config/database";
import { User, Role } from "@prisma/client";

export const findUserByEmail = async (email: string): Promise<User | null> => {
    return prisma.user.findUnique({ where: { email } });
};

export const createUserWithPlayer = async (data: {
    email: string;
    hashedPassword: string;
    fullName: string;
    birthDate: Date;
    NIF: string;
    fideId?: string;
}): Promise<User> => {
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email: data.email,
                password: data.hashedPassword,
                fullName: data.fullName,
                role: Role.player,
            }
        });
        const elo = await tx.elo.create({ data: {} });
        await tx.player.create({
            data: {
                userId: user.id,
                eloId: elo.id,
                birthDate: data.birthDate,
                NIF: data.NIF,
                fideId: data.fideId,
            }
        });
        return user;
    });
};

export const updateUserPushToken = async (userId: number, pushToken: string): Promise<void> => {
    await prisma.user.update({ where: { id: userId }, data: { pushToken } });
};

export const createDelegate = async (data: {
    email: string;
    hashedPassword: string;
    fullName: string;
}): Promise<User> => {
    return prisma.user.create({
        data: {
            email: data.email,
            password: data.hashedPassword,
            fullName: data.fullName,
            role: Role.delegate,
        }
    });
};

/**
 * Crea o actualiza la MobileSession del usuario
 */
export const upsertMobileSession = async (userId: number, token: string, expiresAt: Date): Promise<void> => {
    await prisma.mobileSession.upsert({
        where: { token },
        update: { isActive: true, expiresAt },
        create: { userId, token, isActive: true, expiresAt },
    });
};

/**
 * Marca como inactivas todas las sesiones del usuario
 */
export const invalidateUserSessions = async (userId: number): Promise<void> => {
    await prisma.mobileSession.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
    });
};

/**
 * Verifica si existe una sesión activa para el usuario
 */
export const findActiveSession = async (userId: number): Promise<boolean> => {
    const session = await prisma.mobileSession.findFirst({
        where: { userId, isActive: true },
    });
    return !!session;
};
