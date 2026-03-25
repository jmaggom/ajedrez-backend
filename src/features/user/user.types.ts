import { User, Player } from "@prisma/client";

export type UserWithPlayer = User & { player: Player | null };

export type UpdateProfileInput = {
    fullName?: string;
    phone?: string;
    fideId?: string;
    birthDate?: string;
};

export type PlayerProfile = {
    id: number;
    fideId: string | null;
    birthDate: Date | null;
};

export type UserProfile = {
    id: number;
    email: string;
    role: string;
    fullName: string;
    phone: string | null;
    player: PlayerProfile | null;
};
