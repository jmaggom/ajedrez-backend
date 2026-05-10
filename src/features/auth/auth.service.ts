import { GraphQLError } from "graphql";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { User } from "@prisma/client";
import { EmailLoginInput, RegisterPlayerInput, RegisterDelegateInput } from "./auth.types";
import * as authModel from "./auth.model";
import { JWT_SECRET, JWT_EXPIRATION } from "./constants";

const buildToken = (user: User): string => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION as StringValue }
    );
};

const calculateExpirationDate = (): Date => {
    const now = new Date();
    const expirationDays = 7; // Debe coincidir con JWT_EXPIRATION
    return new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);
};

export const login = async (input: EmailLoginInput): Promise<{ mToken: string }> => {
    const user = await authModel.findUserByEmail(input.email);
    if (!user) {
        throw new GraphQLError("User not found", { extensions: { code: "NOT_FOUND" } });
    }

    const isValid = await bcrypt.compare(input.otp, user.password);
    if (!isValid) {
        throw new GraphQLError("Invalid credentials", { extensions: { code: "UNAUTHENTICATED" } });
    }

    const token = buildToken(user);
    const expiresAt = calculateExpirationDate();
    await authModel.upsertMobileSession(user.id, token, expiresAt);

    return { mToken: token };
};

export const registerPlayer = async (input: RegisterPlayerInput): Promise<{ mToken: string }> => {
    const existing = await authModel.findUserByEmail(input.email);
    if (existing) {
        throw new GraphQLError("Email already in use", { extensions: { code: "BAD_USER_INPUT" } });
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = await authModel.createUserWithPlayer({
        email: input.email,
        hashedPassword,
        fullName: input.name,
        birthDate: new Date(input.birthDate),
        NIF: input.NIF,
        fideId: input.fideId,
    });

    const token = buildToken(user);
    const expiresAt = calculateExpirationDate();
    await authModel.upsertMobileSession(user.id, token, expiresAt);

    return { mToken: token };
};

export const savePushToken = async (userId: number, token: string): Promise<boolean> => {
    const { Expo } = await import('expo-server-sdk');
    if (!Expo.isExpoPushToken(token)) {
        throw new GraphQLError('Invalid Expo push token', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    await authModel.updateUserPushToken(userId, token);
    return true;
};

export const registerDelegate = async (input: RegisterDelegateInput): Promise<{ mToken: string }> => {
    const existing = await authModel.findUserByEmail(input.email);
    if (existing) {
        throw new GraphQLError("Email already in use", { extensions: { code: "BAD_USER_INPUT" } });
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = await authModel.createDelegate({
        email: input.email,
        hashedPassword,
        fullName: input.name,
    });

    const token = buildToken(user);
    const expiresAt = calculateExpirationDate();
    await authModel.upsertMobileSession(user.id, token, expiresAt);

    return { mToken: token };
};

/**
 * Invalida todas las sesiones activas del usuario
 */
export const logout = async (userId: number): Promise<boolean> => {
    await authModel.invalidateUserSessions(userId);
    return true;
};
