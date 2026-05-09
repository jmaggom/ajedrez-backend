import type { Prisma } from '@prisma/client';

export type UpdateClubInput = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
};

export type ClubFiltersInput = {
  daysThreshold?: number;
  tournamentId?: string;
};

export const clubSelect = {
  id: true,
  name: true,
  CIF: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  description: true,
  logoUrl: true,
  shortCode: true,
  planActivo: true,
  createdAt: true,
  delegates: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          email: true,
          fullName: true,
          phone: true,
          player: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  },
  players: {
    include: {
      elo: true,
      licenses: true,
      user: true,
    },
  },
} satisfies Prisma.ClubSelect;

export type ClubWithRelations = Prisma.ClubGetPayload<{
  select: typeof clubSelect;
}>;

export type ExpiringLicenseResult = {
  id: string;
  type: string;
  status: string;
  expiresAt: Date;
  player: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
};

export type PlayerWithRelations = Prisma.PlayerGetPayload<{
  include: {
    user: { select: { id: true; fullName: true; avatarUrl: true } };
    elo: { select: { fideClassical: true; fadaClassical: true } };
    licenses: { select: { id: true; type: true; status: true; expiresAt: true } };
  };
}>;

export type ClubPlayerOutput = {
  id: string;
  fullName: string;
  avatarUrl?: string;
  fideId?: string;
  elo: { fideClassical: number; fadaClassical: number };
  licenses: Array<{ id: string; type: string; status: string; expiresAt: string }>;
};
