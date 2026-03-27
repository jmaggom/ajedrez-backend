import { FidePlayerInfo } from "./chesstools.types";
import { CHESSTOOLS_BASE_URL } from "./chesstools.constants";

export const fetchFidePlayerInfo = async (fideId: string): Promise<FidePlayerInfo> => {
    const response = await fetch(
        `${CHESSTOOLS_BASE_URL}/fide/player_info/?fide_id=${encodeURIComponent(fideId)}&history=true`
    );

    if (response.status === 404) {
        throw new Error("FIDE_NOT_FOUND");
    }

    if (!response.ok) {
        throw new Error(`CHESSTOOLS_ERROR:${response.status}`);
    }

    return response.json() as Promise<FidePlayerInfo>;
};
