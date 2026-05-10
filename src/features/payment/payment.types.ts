import type { Prisma } from '@prisma/client';

export type GetReceiptUploadUrlInput = {
  registrationId: string;
  fileName: string;
  mimeType: string;
  amount: number;
};

export type ConfirmReceiptUploadInput = {
  registrationId: string;
  path: string;
  amount: number;
};

export type PaymentHistoryEntry = {
  id: string;
  amount: number;
  date: string;
  status: string;
  validatedAt: string | null;
  tournamentName: string | null;
};
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
  validatedBy: {
    select: { id: true, fullName: true },
  },
  registration: {
    include: {
      tournament: {
        select: { id: true, name: true, organizerId: true, startDate: true },
      },
      player: {
        include: {
          user: {
            select: { id: true, fullName: true },
          },
        },
      },
    },
  },
} satisfies Prisma.PaymentReceiptSelect;

export type PaymentReceiptWithRelations = Prisma.PaymentReceiptGetPayload<{
  select: typeof paymentReceiptSelect;
}>;

export const registrationWithOwnerSelect = {
  id: true,
  playerId: true,
  tournamentId: true,
  status: true,
  paymentReceipt: true,
  player: {
    select: { userId: true },
  },
} satisfies Prisma.RegistrationSelect;

export type RegistrationWithOwner = Prisma.RegistrationGetPayload<{
  select: typeof registrationWithOwnerSelect;
}>;

