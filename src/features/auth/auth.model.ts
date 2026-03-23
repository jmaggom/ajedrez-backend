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
    licenseNumber?: string;
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
                licenseNumber: data.licenseNumber,
            }
        });
        return user;
    });
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
