import { generateSwissPairings } from '../../game.pairings';
import type {
  PairingPlayerInput,
  HistoricalMatchup,
  ColorHistory,
  NormalPairing,
  ByePairing,
} from '../../game.types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const createPlayer = (
  playerId: number,
  fideClassical: number,
  points: number = 0,
): PairingPlayerInput => ({
  playerId,
  fideClassical,
  points,
});

const createMatchup = (playerAId: number, playerBId: number): HistoricalMatchup => ({
  playerAId,
  playerBId,
});

const createColorHistory = (whites: number, blacks: number): ColorHistory => ({
  whites,
  blacks,
});

const isNormalPairing = (pairing: NormalPairing | ByePairing): pairing is NormalPairing =>
  !pairing.isBye;

const isByePairing = (pairing: NormalPairing | ByePairing): pairing is ByePairing =>
  pairing.isBye;

// ── Ronda 1 ──────────────────────────────────────────────────────────────────

describe('generateSwissPairings — Ronda 1', () => {
  it('con 4 jugadores: ordena por fideClassical desc y empareja 1º vs 2º, 3º vs 4º', () => {
    const players = [
      createPlayer(1, 2000),
      createPlayer(2, 1900),
      createPlayer(3, 1800),
      createPlayer(4, 1700),
    ];

    const result = generateSwissPairings(players, [], 1, new Map());

    expect(result).toHaveLength(2);

    const pairing1 = result[0];
    const pairing2 = result[1];

    expect(isNormalPairing(pairing1)).toBe(true);
    expect(isNormalPairing(pairing2)).toBe(true);

    if (isNormalPairing(pairing1) && isNormalPairing(pairing2)) {
      // 1º (2000) vs 2º (1900) — el de mayor ELO recibe blancas
      expect([pairing1.whitePlayerId, pairing1.blackPlayerId].sort()).toEqual([1, 2]);
      expect(pairing1.whitePlayerId).toBe(1); // mayor ELO
      expect(pairing1.blackPlayerId).toBe(2);
      expect(pairing1.tableNumber).toBe(1);

      // 3º (1800) vs 4º (1700)
      expect([pairing2.whitePlayerId, pairing2.blackPlayerId].sort()).toEqual([3, 4]);
      expect(pairing2.whitePlayerId).toBe(3); // mayor ELO
      expect(pairing2.blackPlayerId).toBe(4);
      expect(pairing2.tableNumber).toBe(2);
    }
  });

  it('con 3 jugadores (impar): genera 1 par + 1 BYE para el jugador de menor ELO', () => {
    const players = [
      createPlayer(1, 2000),
      createPlayer(2, 1900),
      createPlayer(3, 1800),
    ];

    const result = generateSwissPairings(players, [], 1, new Map());

    expect(result).toHaveLength(2);

    const normalPairings = result.filter(isNormalPairing);
    const byePairings = result.filter(isByePairing);

    expect(normalPairings).toHaveLength(1);
    expect(byePairings).toHaveLength(1);

    // Par: 1 vs 2
    expect(normalPairings[0].whitePlayerId).toBe(1);
    expect(normalPairings[0].blackPlayerId).toBe(2);
    expect(normalPairings[0].tableNumber).toBe(1);

    // BYE: jugador 3 (menor ELO)
    expect(byePairings[0].byePlayerId).toBe(3);
    expect(byePairings[0].tableNumber).toBe(2);
  });

  it('con 2 jugadores: genera 1 par', () => {
    const players = [createPlayer(1, 2000), createPlayer(2, 1900)];

    const result = generateSwissPairings(players, [], 1, new Map());

    expect(result).toHaveLength(1);

    const pairing = result[0];
    expect(isNormalPairing(pairing)).toBe(true);

    if (isNormalPairing(pairing)) {
      expect(pairing.whitePlayerId).toBe(1); // mayor ELO
      expect(pairing.blackPlayerId).toBe(2);
      expect(pairing.tableNumber).toBe(1);
    }
  });

  it('con 1 jugador: genera 1 BYE', () => {
    const players = [createPlayer(1, 2000)];

    const result = generateSwissPairings(players, [], 1, new Map());

    expect(result).toHaveLength(1);

    const pairing = result[0];
    expect(isByePairing(pairing)).toBe(true);

    if (isByePairing(pairing)) {
      expect(pairing.byePlayerId).toBe(1);
      expect(pairing.tableNumber).toBe(1);
    }
  });

  it('las mesas se asignan correctamente (Mesa 1, Mesa 2, etc.)', () => {
    const players = [
      createPlayer(1, 2200),
      createPlayer(2, 2100),
      createPlayer(3, 2000),
      createPlayer(4, 1900),
      createPlayer(5, 1800),
      createPlayer(6, 1700),
    ];

    const result = generateSwissPairings(players, [], 1, new Map());

    expect(result).toHaveLength(3);
    expect(result[0].tableNumber).toBe(1);
    expect(result[1].tableNumber).toBe(2);
    expect(result[2].tableNumber).toBe(3);
  });
});

// ── Rondas siguientes (R2+) ──────────────────────────────────────────────────

describe('generateSwissPairings — Rondas siguientes (R2+)', () => {
  it('ordena por puntos desc (no por ELO) en ronda 2', () => {
    const players = [
      createPlayer(1, 1800, 1), // ELO bajo, 1 punto
      createPlayer(2, 2000, 0.5), // ELO alto, 0.5 puntos
      createPlayer(3, 1900, 0.5),
      createPlayer(4, 1700, 0),
    ];

    const result = generateSwissPairings(players, [], 2, new Map());

    expect(result).toHaveLength(2);

    // Primer emparejamiento: jugador con más puntos (1) vs siguiente disponible (2)
    const pairing1 = result[0];
    expect(isNormalPairing(pairing1)).toBe(true);

    if (isNormalPairing(pairing1)) {
      // El jugador 1 (1 punto, ELO 1800) debe emparejar con el siguiente sin rematch
      expect([pairing1.whitePlayerId, pairing1.blackPlayerId].sort()).toEqual([1, 2]);
    }

    // Segundo emparejamiento: resto
    const pairing2 = result[1];
    expect(isNormalPairing(pairing2)).toBe(true);

    if (isNormalPairing(pairing2)) {
      expect([pairing2.whitePlayerId, pairing2.blackPlayerId].sort()).toEqual([3, 4]);
    }
  });

  it('evita rematches: si los 2 jugadores con más puntos ya jugaron, busca alternativa', () => {
    const players = [
      createPlayer(1, 2000, 1),
      createPlayer(2, 1900, 1),
      createPlayer(3, 1800, 0.5),
      createPlayer(4, 1700, 0),
    ];

    // Los jugadores 1 y 2 ya jugaron entre sí en R1
    const matchups = [createMatchup(1, 2)];

    const result = generateSwissPairings(players, matchups, 2, new Map());

    expect(result).toHaveLength(2);

    const pairing1 = result[0];
    expect(isNormalPairing(pairing1)).toBe(true);

    if (isNormalPairing(pairing1)) {
      // El jugador 1 debe emparejar con 3 (evita rematch con 2)
      expect([pairing1.whitePlayerId, pairing1.blackPlayerId].sort()).toEqual([1, 3]);
    }

    const pairing2 = result[1];
    expect(isNormalPairing(pairing2)).toBe(true);

    if (isNormalPairing(pairing2)) {
      // Los jugadores 2 y 4 quedan como par
      expect([pairing2.whitePlayerId, pairing2.blackPlayerId].sort()).toEqual([2, 4]);
    }
  });

  it('con empate en puntos: usa fideClassical como tiebreak', () => {
    const players = [
      createPlayer(1, 1800, 1), // 1 punto, menor ELO
      createPlayer(2, 2000, 1), // 1 punto, mayor ELO
      createPlayer(3, 1700, 0.5),
      createPlayer(4, 1600, 0),
    ];

    const result = generateSwissPairings(players, [], 2, new Map());

    expect(result).toHaveLength(2);

    // Ordenados por puntos desc + ELO desc:
    // 1. Jugador 2 (1 punto, ELO 2000)
    // 2. Jugador 1 (1 punto, ELO 1800)
    // 3. Jugador 3 (0.5 puntos)
    // 4. Jugador 4 (0 puntos)

    const pairing1 = result[0];
    expect(isNormalPairing(pairing1)).toBe(true);

    if (isNormalPairing(pairing1)) {
      // Jugador 2 (mayor ELO en el grupo de 1 punto) vs jugador 1
      expect([pairing1.whitePlayerId, pairing1.blackPlayerId].sort()).toEqual([1, 2]);
    }
  });

  it('con número impar en R2: el jugador con menos puntos recibe el BYE', () => {
    const players = [
      createPlayer(1, 2000, 1),
      createPlayer(2, 1900, 1),
      createPlayer(3, 1800, 0),
    ];

    const result = generateSwissPairings(players, [], 2, new Map());

    expect(result).toHaveLength(2);

    const normalPairings = result.filter(isNormalPairing);
    const byePairings = result.filter(isByePairing);

    expect(normalPairings).toHaveLength(1);
    expect(byePairings).toHaveLength(1);

    // Par: 1 vs 2
    if (isNormalPairing(normalPairings[0])) {
      expect([normalPairings[0].whitePlayerId, normalPairings[0].blackPlayerId].sort()).toEqual([
        1, 2,
      ]);
    }

    // BYE: jugador 3 (0 puntos, último en el ranking)
    expect(byePairings[0].byePlayerId).toBe(3);
  });
});

// ── Colores ──────────────────────────────────────────────────────────────────

describe('generateSwissPairings — Colores', () => {
  it('en R1 sin historial: el jugador con más ELO recibe blancas', () => {
    const players = [createPlayer(1, 2000), createPlayer(2, 1900)];

    const result = generateSwissPairings(players, [], 1, new Map());

    expect(result).toHaveLength(1);

    const pairing = result[0];
    expect(isNormalPairing(pairing)).toBe(true);

    if (isNormalPairing(pairing)) {
      expect(pairing.whitePlayerId).toBe(1); // mayor ELO
      expect(pairing.blackPlayerId).toBe(2);
    }
  });

  it('en R2+: el jugador con menos blancos acumulados recibe blancas', () => {
    const players = [
      createPlayer(1, 2000, 1), // jugó 1 vez con blancas
      createPlayer(2, 1900, 1), // jugó 1 vez con negras
    ];

    const colorHistory = new Map<number, ColorHistory>();
    colorHistory.set(1, createColorHistory(1, 0)); // 1 blanca, 0 negras
    colorHistory.set(2, createColorHistory(0, 1)); // 0 blancas, 1 negra

    const result = generateSwissPairings(players, [], 2, colorHistory);

    expect(result).toHaveLength(1);

    const pairing = result[0];
    expect(isNormalPairing(pairing)).toBe(true);

    if (isNormalPairing(pairing)) {
      // Jugador 2 tiene balance -1 (menos blancos), debe recibir blancas
      expect(pairing.whitePlayerId).toBe(2);
      expect(pairing.blackPlayerId).toBe(1);
    }
  });

  it('si ambos tienen el mismo balance: el de mayor ELO recibe blancas', () => {
    const players = [
      createPlayer(1, 1900, 1), // ELO menor
      createPlayer(2, 2000, 1), // ELO mayor
    ];

    const colorHistory = new Map<number, ColorHistory>();
    colorHistory.set(1, createColorHistory(1, 1)); // balance 0
    colorHistory.set(2, createColorHistory(1, 1)); // balance 0

    const result = generateSwissPairings(players, [], 2, colorHistory);

    expect(result).toHaveLength(1);

    const pairing = result[0];
    expect(isNormalPairing(pairing)).toBe(true);

    if (isNormalPairing(pairing)) {
      // Ambos tienen balance 0, el de mayor ELO (2) recibe blancas
      // Pero según el algoritmo, si el balance es igual (0 == 0 es falso),
      // entra en la condición aBalance <= bBalance
      // Jugador 1 tiene balance 0, jugador 2 tiene balance 0
      // aBalance (0) <= bBalance (0) → true → playerA recibe blancas
      // Pero el orden en el array sorted es: 2 (2000), 1 (1900)
      // Entonces playerA es 2, playerB es 1
      // aBalance = 0, bBalance = 0, aBalance <= bBalance → true
      // → whiteId = 2, blackId = 1
      expect(pairing.whitePlayerId).toBe(2); // mayor ELO
      expect(pairing.blackPlayerId).toBe(1);
    }
  });
});

// ── Casos edge ───────────────────────────────────────────────────────────────

describe('generateSwissPairings — Casos edge', () => {
  it('con 0 jugadores: devuelve array vacío', () => {
    const result = generateSwissPairings([], [], 1, new Map());

    expect(result).toEqual([]);
  });

  it('todos los posibles emparejamientos son rematches: acepta el rematch inevitable', () => {
    const players = [
      createPlayer(1, 2000, 1),
      createPlayer(2, 1900, 1),
      createPlayer(3, 1800, 0.5),
      createPlayer(4, 1700, 0.5),
    ];

    // Todos jugaron entre sí en rondas anteriores
    const matchups = [
      createMatchup(1, 2),
      createMatchup(1, 3),
      createMatchup(1, 4),
      createMatchup(2, 3),
      createMatchup(2, 4),
      createMatchup(3, 4),
    ];

    const result = generateSwissPairings(players, matchups, 2, new Map());

    // Debe generar emparejamientos a pesar de todos ser rematches
    expect(result).toHaveLength(2);

    const normalPairings = result.filter(isNormalPairing);
    expect(normalPairings).toHaveLength(2);

    // Verifica que todos los jugadores fueron emparejados
    const pairedPlayers = new Set<number>();
    normalPairings.forEach((p) => {
      if (isNormalPairing(p)) {
        pairedPlayers.add(p.whitePlayerId);
        pairedPlayers.add(p.blackPlayerId);
      }
    });
    expect(pairedPlayers.size).toBe(4);
  });
});
