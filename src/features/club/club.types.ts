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
      email: true,
      fullName: true,
      phone: true,
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

export const paymentReceiptSelect = {
  id: true,
  registrationId: true,
  licenseId: true,
  amount: true,
  date: true,
  status: true,
  fileUrl: true,
  validatedById: true,
  validatedAt: true,
  registration: {
    include: {
      player: {
        include: {
          user: true,
        },
      },
      tournament: {
        select: {
          id: true,
          name: true,
          startDate: true,
        },
      },
    },
  },
} satisfies Prisma.PaymentReceiptSelect;

export type PaymentReceiptWithRelations = Prisma.PaymentReceiptGetPayload<{
  select: typeof paymentReceiptSelect;
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
