import type { Prisma, Registration } from '@prisma/client';

export enum TournamentMode {
  CLASSICAL = 'CLASSICAL',
  RAPID = 'RAPID',
  BLITZ = 'BLITZ',
}

export type EloFilter = {
  minFideClassical?: number;
  maxFideClassical?: number;
  minFideRapid?: number;
  maxFideRapid?: number;
  minFideBlitz?: number;
  maxFideBlitz?: number;
  minFadaClassical?: number;
  maxFadaClassical?: number;
  minFadaRapid?: number;
  maxFadaRapid?: number;
  minFadaBlitz?: number;
  maxFadaBlitz?: number;
};

export type TournamentRequirements = {
  requireFideId: boolean;
  requireFadaId: boolean;
  eloFilter?: EloFilter;
};

export type CreateTournamentInput = {
  name: string;
  venue: string;
  latitude?: number;
  longitude?: number;
  notificationRadius?: number;
  geoNotificationActive?: boolean;
  startDate: string;
  endDate: string;
  format: string;
  rounds: number;
  timeControl: string;
  availableSlots: number;
  registrationFee: number;
  description?: string;
  eloEligible: boolean;
  requirements: TournamentRequirements;
  publishNow?: boolean;
  mode: TournamentMode;
};

export type UpdateTournamentInput = Partial<CreateTournamentInput>;

export type TournamentFiltersInput = {
  status?: string;
  statuses?: string[];
  mode?: string;
  name?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  clubId?: number;
};

export type RegistrationResult = {
  registration: Registration;
};

export type DeleteTournamentResult = {
  success: boolean;
  hadConfirmedRegistrations: boolean;
};

export type RegistrationErrorCode =
  | 'NOT_FOUND'
  | 'TOURNAMENT_NOT_OPEN'
  | 'PLAYER_PROFILE_REQUIRED'
  | 'ALREADY_REGISTERED'
  | 'FIDE_LICENSE_REQUIRED'
  | 'FADA_LICENSE_REQUIRED'
  | 'ELO_TOO_LOW'
  | 'ELO_TOO_HIGH'
  | 'TOURNAMENT_FULL'
  | 'FREEMIUM_LIMIT_REACHED'
  | 'NO_CLUB_ASSIGNED'
  | 'FORBIDDEN'
  | 'CANNOT_CANCEL_CONFIRMED'
  | 'PREMIUM_REQUIRED';

export const tournamentSelect = {
  id: true,
  name: true,
  organizerId: true,
  venue: true,
  latitude: true,
  longitude: true,
  notificationRadius: true,
  geoNotificationActive: true,
  startDate: true,
  endDate: true,
  format: true,
  rounds: true,
  currentRound: true,
  timeControl: true,
  mode: true,
  availableSlots: true,
  registrationFee: true,
  status: true,
  description: true,
  eloEligible: true,
  requirements: true,
  organizer: true,
  registrations: {
    include: {
      player: {
        include: { user: { select: { fullName: true } } },
      },
    },
  },
} satisfies Prisma.TournamentSelect;

export type NearbyTournamentsInput = {
  lat: number;
  lng: number;
  radiusKm: number;
};

export type TournamentWithRelations = Prisma.TournamentGetPayload<{
  select: typeof tournamentSelect;
}>;
