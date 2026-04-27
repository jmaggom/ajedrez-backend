import { Prisma } from "@prisma/client";

export enum UserRole {
    ADMIN = 'ADMIN',
    DELEGATE = 'DELEGATE',
    PLAYER = 'PLAYER',
    REFEREE = 'REFEREE',
}

const PRISMA_ROLE_MAP: Record<string, UserRole> = {
    admin: UserRole.ADMIN,
    delegate: UserRole.DELEGATE,
    player: UserRole.PLAYER,
    referee: UserRole.REFEREE,
};

export const toUserRole = (prismaRole: string): UserRole => {
    const mapped = PRISMA_ROLE_MAP[prismaRole];
    if (!mapped) throw new Error(`Unknown role: ${prismaRole}`);
    return mapped;
};

export type UpdateProfileInput = {
    fullName?: string;
    phone?: string;
    fideId?: string;
    birthDate?: string;
};

export type GetAvatarUploadUrlInput = {
    fileName: string;
    mimeType: string;
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
    clubId: number | null;
    elo: EloProfile | null;
    eloHistory: EloHistoryEntry[];
};

export type DelegateProfile = {
    id: number;
    clubId: number;
};

export type UserProfile = {
    id: number;
    email: string;
    role: UserRole;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    player: PlayerProfile | null;
    delegate: DelegateProfile | null;
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

export const delegateSelect = {
    id: true,
    clubId: true,
};

export type UserWithPlayer = Prisma.UserGetPayload<{
    include: {
        player: { select: typeof playerSelect };
        delegate: { select: typeof delegateSelect };
    };
}>;

export type SyncPlayerFideDataInput = {
    fullName: string;
    federation: string;
    elo: {
        fideClassical: number;
        fideRapid: number;
        fideBlitz: number;
        fideClassicalGames: number;
        fideRapidGames: number;
        fideBlitzGames: number;
    };
    historyEntries: Array<{
        period: string;
        classical: number | null;
        rapid: number | null;
        blitz: number | null;
        classicalGames: number | null;
        rapidGames: number | null;
        blitzGames: number | null;
    }>;
};

