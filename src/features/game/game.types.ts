import type { Prisma } from '@prisma/client';
import { GameResult } from '@prisma/client';

export enum GameResultInput {
  WHITE_WINS = 'WHITE_WINS',
  BLACK_WINS = 'BLACK_WINS',
  DRAW = 'DRAW',
}

export type SubmitGameResultInput = {
  gameId: string;
  result: GameResultInput;
};

export type CreateGameInput = {
  tournamentId: string;
  roundNumber: number;
  whitePlayerId: string;
  blackPlayerId: string;
};

export const gameSelect = {
  id: true,
  tournamentId: true,
  roundNumber: true,
  tableNumber: true,
  isBye: true,
  whitePlayerId: true,
  blackPlayerId: true,
  byePlayerId: true,
  result: true,
  moves: true,
  notes: true,
  durationSeconds: true,
  eloEligible: true,
  registeredById: true,
  whitePlayer: {
    include: {
      user: { select: { fullName: true } },
      elo: { select: { fideClassical: true, fadaClassical: true } },
    },
  },
  blackPlayer: {
    include: {
      user: { select: { fullName: true } },
      elo: { select: { fideClassical: true, fadaClassical: true } },
    },
  },
  byePlayer: {
    include: {
      user: { select: { fullName: true } },
      elo: { select: { fideClassical: true, fadaClassical: true } },
    },
  },
  registeredBy: {
    select: { id: true, fullName: true, role: true },
  },
} satisfies Prisma.GameSelect;

export type GameWithRelations = Prisma.GameGetPayload<{
  select: typeof gameSelect;
}>;

export const tournamentResultSelect = {
  id: true,
  playerId: true,
  tournamentId: true,
  finalPosition: true,
  points: true,
  winsAsWhite: true,
  drawsAsWhite: true,
  lossesAsWhite: true,
  winsAsBlack: true,
  drawsAsBlack: true,
  lossesAsBlack: true,
  performanceRating: true,
  eloEligible: true,
  isFideRated: true,
  isFadaRated: true,
  eloChangeFide: true,
  eloChangeFada: true,
  eloChangeOnline: true,
  player: {
    include: {
      user: { select: { fullName: true } },
      elo: { select: { fideClassical: true, fadaClassical: true } },
    },
  },
} satisfies Prisma.TournamentResultSelect;

export type TournamentResultWithRelations = Prisma.TournamentResultGetPayload<{
  select: typeof tournamentResultSelect;
}>;

export type PointsMap = Record<GameResult, number>;

export type PlayerStats = {
  points: number;
  winsAsWhite: number;
  drawsAsWhite: number;
  lossesAsWhite: number;
  winsAsBlack: number;
  drawsAsBlack: number;
  lossesAsBlack: number;
};

// ── Tipos para emparejamientos ──────────────────────────────────────────────

export type RoundStatus = 'PENDING_PAIRINGS' | 'PAIRINGS_PUBLISHED' | 'RESULTS_COMPLETE';

export type RoundPairingPlayer = {
  id: string;
  fullName: string;
  fideId: string | null;
  elo: { fideClassical: number; fadaClassical: number } | null;
};

export type RoundPairing = {
  gameId: string;
  roundNumber: number;
  tableNumber: number;
  isBye: boolean;
  result: string | null;
  whitePlayer: RoundPairingPlayer | null;
  blackPlayer: RoundPairingPlayer | null;
  byePlayer: RoundPairingPlayer | null;
};

export type RoundSummary = {
  roundNumber: number;
  status: RoundStatus;
  pairings: RoundPairing[];
};

export type PublishPairingsPayload = {
  roundNumber: number;
  pairings: RoundPairing[];
};

// ── Tipos para el algoritmo de emparejamiento ───────────────────────────────

export type PairingPlayerInput = {
  playerId: number;
  fideClassical: number;
  points: number;
};

export type HistoricalMatchup = {
  playerAId: number;
  playerBId: number;
};

export type ColorHistory = {
  whites: number;
  blacks: number;
};

export type NormalPairing = {
  whitePlayerId: number;
  blackPlayerId: number;
  tableNumber: number;
  isBye: false;
};

export type ByePairing = {
  byePlayerId: number;
  tableNumber: number;
  isBye: true;
};

export type Pairing = NormalPairing | ByePairing;
