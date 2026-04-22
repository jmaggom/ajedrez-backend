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
  whitePlayerId: true,
  blackPlayerId: true,
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
