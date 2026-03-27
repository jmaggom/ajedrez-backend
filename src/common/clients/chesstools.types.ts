export type FideHistoryEntry = {
    period: string;
    date: string;
    classical_rating: number | null;
    rapid_rating: number | null;
    blitz_rating: number | null;
    classical_games: number | null;
    rapid_games: number | null;
    blitz_games: number | null;
};

export type FidePlayerInfo = {
    fide_id: string;
    name: string;
    birth_year: number;
    federation: string;
    fide_title: string | null;
    sex: string | null;
    history: FideHistoryEntry[];
};
