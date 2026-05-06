import type {
  ByePairing,
  ColorHistory,
  HistoricalMatchup,
  NormalPairing,
  Pairing,
  PairingPlayerInput,
} from './game.types';

/**
 * Genera emparejamientos para una ronda de torneo (función pura, sin acceso a BD).
 *
 * R1: ordena por fideClassical desc, empareja 1º vs 2º, 3º vs 4º...
 * R2+: ordena por points desc (desempate fideClassical), evita rematches.
 * Si número impar: el último jugador recibe BYE (+1 punto automático).
 * Colores: se balancea respecto al historial de blancos/negros de cada jugador.
 */
export const generateSwissPairings = (
  players: PairingPlayerInput[],
  previousMatchups: HistoricalMatchup[],
  round: number,
  colorHistory: Map<number, ColorHistory>,
): Pairing[] => {
  if (players.length === 0) return [];

  const sorted = sortPlayers(players, round);
  const pairings: Pairing[] = [];
  const paired = new Set<number>();

  // Si número impar → el último recibe BYE
  let byePlayerId: number | null = null;
  if (sorted.length % 2 !== 0) {
    const byeCandidate = findByeCandidate(sorted, previousMatchups);
    byePlayerId = byeCandidate;
    paired.add(byePlayerId);
  }

  const tableStart = 1;
  let tableNumber = tableStart;

  for (let i = 0; i < sorted.length; i++) {
    const player = sorted[i];
    if (paired.has(player.playerId)) continue;

    // Buscar oponente: siguiente no emparejado sin rematch
    let opponentIdx = findOpponent(sorted, i, paired, previousMatchups);

    // Si no hay oponente sin rematch, usar el siguiente disponible
    if (opponentIdx === -1) {
      opponentIdx = findNextAvailable(sorted, i, paired);
    }

    if (opponentIdx === -1) continue; // no debería ocurrir

    const opponent = sorted[opponentIdx];
    paired.add(player.playerId);
    paired.add(opponent.playerId);

    const { whiteId, blackId } = assignColors(player.playerId, opponent.playerId, colorHistory);

    pairings.push({
      whitePlayerId: whiteId,
      blackPlayerId: blackId,
      tableNumber,
      isBye: false,
    } satisfies NormalPairing);

    tableNumber++;
  }

  // Añadir BYE al final
  if (byePlayerId !== null) {
    pairings.push({
      byePlayerId,
      tableNumber,
      isBye: true,
    } satisfies ByePairing);
  }

  return pairings;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const sortPlayers = (players: PairingPlayerInput[], round: number): PairingPlayerInput[] => {
  if (round === 1) {
    // R1: ordenar por ELO descendente
    return [...players].sort((a, b) => b.fideClassical - a.fideClassical);
  }
  // R2+: ordenar por puntos desc, desempate por ELO
  return [...players].sort(
    (a, b) => b.points - a.points || b.fideClassical - a.fideClassical,
  );
};

const havePlayedBefore = (
  playerAId: number,
  playerBId: number,
  matchups: HistoricalMatchup[],
): boolean =>
  matchups.some(
    (m) =>
      (m.playerAId === playerAId && m.playerBId === playerBId) ||
      (m.playerAId === playerBId && m.playerBId === playerAId),
  );

const findByeCandidate = (
  sorted: PairingPlayerInput[],
  _matchups: HistoricalMatchup[],
): number => {
  // El jugador con menos puntos (último en el ranking) recibe BYE
  return sorted[sorted.length - 1].playerId;
};

const findOpponent = (
  sorted: PairingPlayerInput[],
  fromIdx: number,
  paired: Set<number>,
  matchups: HistoricalMatchup[],
): number => {
  const player = sorted[fromIdx];
  for (let j = fromIdx + 1; j < sorted.length; j++) {
    if (paired.has(sorted[j].playerId)) continue;
    if (!havePlayedBefore(player.playerId, sorted[j].playerId, matchups)) {
      return j;
    }
  }
  return -1;
};

const findNextAvailable = (
  sorted: PairingPlayerInput[],
  fromIdx: number,
  paired: Set<number>,
): number => {
  for (let j = fromIdx + 1; j < sorted.length; j++) {
    if (!paired.has(sorted[j].playerId)) return j;
  }
  return -1;
};

const assignColors = (
  playerAId: number,
  playerBId: number,
  colorHistory: Map<number, ColorHistory>,
): { whiteId: number; blackId: number } => {
  const aHistory = colorHistory.get(playerAId) ?? { whites: 0, blacks: 0 };
  const bHistory = colorHistory.get(playerBId) ?? { whites: 0, blacks: 0 };

  const aBalance = aHistory.whites - aHistory.blacks;
  const bBalance = bHistory.whites - bHistory.blacks;

  // El jugador con menos blancos (menor balance) recibe blancas
  if (aBalance <= bBalance) {
    return { whiteId: playerAId, blackId: playerBId };
  }
  return { whiteId: playerBId, blackId: playerAId };
};
