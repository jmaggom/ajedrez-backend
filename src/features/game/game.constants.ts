import { GameResult } from "@prisma/client";
import { GameResultInput, PointsMap } from "./game.types";

export const GAME_RESULT_MAP: Record<GameResultInput, GameResult> = {
    [GameResultInput.WHITE_WINS]: GameResult.white_wins,
    [GameResultInput.BLACK_WINS]: GameResult.black_wins,
    [GameResultInput.DRAW]: GameResult.draw,
};

export const WHITE_POINTS: PointsMap = {
    [GameResult.white_wins]: 1,
    [GameResult.black_wins]: 0,
    [GameResult.draw]: 0.5,
    [GameResult.bye]: 0,
};

export const BLACK_POINTS: PointsMap = {
    [GameResult.white_wins]: 0,
    [GameResult.black_wins]: 1,
    [GameResult.draw]: 0.5,
    [GameResult.bye]: 0,
};