import { Prisma } from "@prisma/client";

export type UpdateProfileInput = {
    fullName?: string;
    phone?: string;
    fideId?: string;
    birthDate?: string;
};

export type EloProfile = {
    fideClassical: number;
    fideRapid: number;
    fideBlitz: number;
    fadaClassical: number;
    fadaRapid: number;
    fadaBlitz: number;
    onlineClassical: number;
    onlineRapid: number;
    onlineBlitz: number;
    fideClassicalGames: number;
    fideRapidGames: number;
    fideBlitzGames: number;
    fadaClassicalGames: number;
    fadaRapidGames: number;
    fadaBlitzGames: number;
    onlineClassicalGames: number;
    onlineRapidGames: number;
    onlineBlitzGames: number;
};

export type EloHistoryEntry = {
    id: number;
    source: string;
    period: string;
    classical: number | null;
    rapid: number | null;
    blitz: number | null;
    classicalGames: number | null;
    rapidGames: number | null;
    blitzGames: number | null;
    updatedAt: Date;
};

export type PlayerProfile = {
    id: number;
    fideId: string | null;
    birthDate: Date | null;
    federation: string | null;
    elo: EloProfile | null;
    eloHistory: EloHistoryEntry[];
};

export type UserProfile = {
    id: number;
    email: string;
    role: string;
    fullName: string;
    phone: string | null;
    player: PlayerProfile | null;
};

export const playerSelect = {
    id: true,
    fideId: true,
    federation: true,
    userId: true,
    birthDate: true,
    NIF: true,
    clubId: true,
    eloId: true,
    joinedAt: true,
    leftAt: true,
    elo: true,
    eloHistory: {
        orderBy: { period: "asc" as const },
    },
};

export type UserWithPlayer = Prisma.UserGetPayload<{
    include: { player: { select: typeof playerSelect } };
}>;

export type SyncFideDataResponse = {
    name: string;
    federation: string;
    birthYear: number;
    currentClassical: number | null;
    currentRapid: number | null;
    currentBlitz: number | null;
    historySynced: number;
};
