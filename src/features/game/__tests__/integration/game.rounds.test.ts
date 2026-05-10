import { GameResult, Role, TournamentStatus } from '@prisma/client'
import * as gameModel from '../../game.model'
import * as gameService from '../../game.service'
import * as gamePairings from '../../game.pairings'
import * as tournamentModel from '../../../tournament/tournament.model'
import type { GameWithRelations, TournamentResultWithRelations } from '../../game.types'
import { GameResultInput } from '../../game.types'

jest.mock('../../game.model')
jest.mock('../../game.pairings')
jest.mock('../../../tournament/tournament.model')
jest.mock('../../../../common/notification/notification.service', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
}))

const model = gameModel as jest.Mocked<typeof gameModel>
const pairings = gamePairings as jest.Mocked<typeof gamePairings>
const tournamentModelMocked = tournamentModel as jest.Mocked<typeof tournamentModel>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockTournament = {
  id: 1,
  name: 'Open Test',
  eloEligible: false,
  organizerId: 1,
  status: TournamentStatus.open,
  rounds: 2,
  currentRound: 0,
}

const mockReferee = { id: 1, role: 'referee', clubId: null }

const mockPlayers = [
  { playerId: 1, userId: 10, fideClassical: 2000, fideId: null, fullName: 'Jugador 1' },
  { playerId: 2, userId: 20, fideClassical: 1900, fideId: null, fullName: 'Jugador 2' },
  { playerId: 3, userId: 30, fideClassical: 1800, fideId: null, fullName: 'Jugador 3' },
  { playerId: 4, userId: 40, fideClassical: 1700, fideId: null, fullName: 'Jugador 4' },
]

const mockPlayerEntity = (p: typeof mockPlayers[0]) => ({
  id: p.playerId,
  userId: p.userId,
  birthDate: new Date('2000-01-01'),
  NIF: `NIF${p.playerId}`,
  fideId: p.fideId,
  federation: null,
  clubId: null,
  eloId: p.playerId,
  joinedAt: new Date('2025-01-01'),
  leftAt: null,
  lastLatitude: null,
  lastLongitude: null,
  lastLocationAt: null,
  user: { fullName: p.fullName },
  elo: {
    fadaClassical: p.fideClassical - 50,
    fideClassical: p.fideClassical,
  },
})

const createGameWithRelations = (data: {
  id: number
  roundNumber: number
  whitePlayerId: number
  blackPlayerId: number
  result?: GameResult | null
  tableNumber?: number
}): GameWithRelations => ({
  id: data.id,
  tournamentId: 1,
  roundNumber: data.roundNumber,
  tableNumber: data.tableNumber ?? 1,
  isBye: false,
  whitePlayerId: data.whitePlayerId,
  blackPlayerId: data.blackPlayerId,
  byePlayerId: null,
  result: data.result ?? null,
  moves: null,
  notes: null,
  durationSeconds: null,
  eloEligible: false,
  registeredById: null,
  whitePlayer: mockPlayerEntity(mockPlayers[data.whitePlayerId - 1]),
  blackPlayer: mockPlayerEntity(mockPlayers[data.blackPlayerId - 1]),
  byePlayer: null,
  registeredBy: null,
})

const createByeGameWithRelations = (data: {
  id: number
  roundNumber: number
  byePlayerId: number
  tableNumber: number
}): GameWithRelations => ({
  id: data.id,
  tournamentId: 1,
  roundNumber: data.roundNumber,
  tableNumber: data.tableNumber,
  isBye: true,
  whitePlayerId: null,
  blackPlayerId: null,
  byePlayerId: data.byePlayerId,
  result: GameResult.bye,
  moves: null,
  notes: null,
  durationSeconds: null,
  eloEligible: false,
  registeredById: null,
  whitePlayer: null,
  blackPlayer: null,
  byePlayer: mockPlayerEntity(mockPlayers[data.byePlayerId - 1]),
  registeredBy: null,
})

const createTournamentResult = (
  playerId: number,
  points: number,
  stats: {
    winsAsWhite?: number
    drawsAsWhite?: number
    lossesAsWhite?: number
    winsAsBlack?: number
    drawsAsBlack?: number
    lossesAsBlack?: number
  } = {},
): TournamentResultWithRelations => ({
  id: playerId,
  playerId,
  tournamentId: 1,
  points,
  winsAsWhite: stats.winsAsWhite ?? 0,
  drawsAsWhite: stats.drawsAsWhite ?? 0,
  lossesAsWhite: stats.lossesAsWhite ?? 0,
  winsAsBlack: stats.winsAsBlack ?? 0,
  drawsAsBlack: stats.drawsAsBlack ?? 0,
  lossesAsBlack: stats.lossesAsBlack ?? 0,
  finalPosition: 0,
  performanceRating: null,
  eloEligible: false,
  isFideRated: false,
  isFadaRated: false,
  eloChangeFide: null,
  eloChangeFada: null,
  eloChangeOnline: null,
  player: mockPlayerEntity(mockPlayers[playerId - 1]),
})

// ── Flujo completo de rondas ──────────────────────────────────────────────────

describe('Flujo completo de rondas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('torneo con 4 jugadores: R1 publicada → resultados registrados → R2 publicada → resultados registrados → closeTournament → clasificación final correcta', async () => {
    // ── RONDA 1: PUBLICAR PAIRINGS ──
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockReferee)
    model.countPendingResultsInRound.mockResolvedValue(0)
    model.findConfirmedPlayersWithElo.mockResolvedValue(mockPlayers)
    model.findGamesByTournament.mockResolvedValue([])
    model.findTournamentResults.mockResolvedValue([])
    model.updateTournamentCurrentRound.mockResolvedValue(undefined)
    model.findConfirmedRegistrationsByTournament.mockResolvedValue(
      mockPlayers.map((p) => ({ player: { userId: p.userId } })),
    )

    pairings.generateSwissPairings.mockReturnValue([
      { whitePlayerId: 1, blackPlayerId: 2, tableNumber: 1, isBye: false },
      { whitePlayerId: 3, blackPlayerId: 4, tableNumber: 2, isBye: false },
    ])

    const r1Game1 = createGameWithRelations({ id: 1, roundNumber: 1, whitePlayerId: 1, blackPlayerId: 2 })
    const r1Game2 = createGameWithRelations({
      id: 2,
      roundNumber: 1,
      whitePlayerId: 3,
      blackPlayerId: 4,
      tableNumber: 2,
    })

    model.createGame.mockResolvedValueOnce(r1Game1).mockResolvedValueOnce(r1Game2)

    await gameService.publishPairings(1, 1)

    expect(model.createGame).toHaveBeenCalledTimes(2)
    expect(model.updateTournamentCurrentRound).toHaveBeenCalledWith(1, 1)

    // ── RONDA 1: REGISTRAR RESULTADOS ──
    model.findGameById.mockResolvedValue(r1Game1)
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.updateGameResult.mockResolvedValue({ ...r1Game1, result: GameResult.white_wins })
    model.findGamesByTournament.mockResolvedValue([{ ...r1Game1, result: GameResult.white_wins }, r1Game2])

    const r1ResultP1 = createTournamentResult(1, 1, { winsAsWhite: 1 })
    const r1ResultP2 = createTournamentResult(2, 0, { lossesAsBlack: 1 })

    model.upsertTournamentResult.mockResolvedValueOnce(r1ResultP1).mockResolvedValueOnce(r1ResultP2)
    model.updateFinalPositions.mockResolvedValue(undefined)
    model.findTournamentResults.mockResolvedValue([r1ResultP1])

    await gameService.submitGameResult({ gameId: '1', result: GameResultInput.WHITE_WINS }, 1)

    expect(model.updateGameResult).toHaveBeenCalledWith(1, GameResult.white_wins, 1)
    expect(model.upsertTournamentResult).toHaveBeenCalled()

    // Resultado partida 2: tablas
    model.findGameById.mockResolvedValue(r1Game2)
    model.updateGameResult.mockResolvedValue({ ...r1Game2, result: GameResult.draw })
    model.findGamesByTournament.mockResolvedValue([
      { ...r1Game1, result: GameResult.white_wins },
      { ...r1Game2, result: GameResult.draw },
    ])

    const r1ResultP3 = createTournamentResult(3, 0.5, { drawsAsWhite: 1 })
    const r1ResultP4 = createTournamentResult(4, 0.5, { drawsAsBlack: 1 })

    model.upsertTournamentResult.mockResolvedValueOnce(r1ResultP3).mockResolvedValueOnce(r1ResultP4)
    model.findTournamentResults.mockResolvedValue([r1ResultP1, r1ResultP3])

    await gameService.submitGameResult({ gameId: '2', result: GameResultInput.DRAW }, 1)

    // ── RONDA 2: PUBLICAR PAIRINGS ──
    model.findTournamentById.mockResolvedValue({ ...mockTournament, currentRound: 1 })
    model.countPendingResultsInRound.mockResolvedValue(0)
    model.findGamesByTournament.mockResolvedValue([
      { ...r1Game1, result: GameResult.white_wins },
      { ...r1Game2, result: GameResult.draw },
    ])
    model.findTournamentResults.mockResolvedValue([
      createTournamentResult(1, 1, { winsAsWhite: 1 }),
      createTournamentResult(3, 0.5, { drawsAsWhite: 1 }),
      createTournamentResult(4, 0.5, { drawsAsBlack: 1 }),
      createTournamentResult(2, 0, { lossesAsBlack: 1 }),
    ])

    pairings.generateSwissPairings.mockReturnValue([
      { whitePlayerId: 1, blackPlayerId: 3, tableNumber: 1, isBye: false },
      { whitePlayerId: 4, blackPlayerId: 2, tableNumber: 2, isBye: false },
    ])

    const r2Game1 = createGameWithRelations({ id: 3, roundNumber: 2, whitePlayerId: 1, blackPlayerId: 3 })
    const r2Game2 = createGameWithRelations({
      id: 4,
      roundNumber: 2,
      whitePlayerId: 4,
      blackPlayerId: 2,
      tableNumber: 2,
    })

    model.createGame.mockResolvedValueOnce(r2Game1).mockResolvedValueOnce(r2Game2)

    await gameService.publishPairings(1, 1)

    // ── RONDA 2: REGISTRAR RESULTADOS ──
    model.findGameById.mockResolvedValue(r2Game1)
    model.updateGameResult.mockResolvedValue({ ...r2Game1, result: GameResult.draw })
    model.findGamesByTournament.mockResolvedValue([
      { ...r1Game1, result: GameResult.white_wins },
      { ...r1Game2, result: GameResult.draw },
      { ...r2Game1, result: GameResult.draw },
      r2Game2,
    ])

    const r2ResultP1 = createTournamentResult(1, 1.5, { winsAsWhite: 1, drawsAsWhite: 1 })
    const r2ResultP3 = createTournamentResult(3, 1, { drawsAsWhite: 1, drawsAsBlack: 1 })

    model.upsertTournamentResult.mockResolvedValueOnce(r2ResultP1).mockResolvedValueOnce(r2ResultP3)
    model.findTournamentResults.mockResolvedValue([r2ResultP1, r2ResultP3])

    await gameService.submitGameResult({ gameId: '3', result: GameResultInput.DRAW }, 1)

    model.findGameById.mockResolvedValue(r2Game2)
    model.updateGameResult.mockResolvedValue({ ...r2Game2, result: GameResult.draw })
    model.findGamesByTournament.mockResolvedValue([
      { ...r1Game1, result: GameResult.white_wins },
      { ...r1Game2, result: GameResult.draw },
      { ...r2Game1, result: GameResult.draw },
      { ...r2Game2, result: GameResult.draw },
    ])

    const r2ResultP4 = createTournamentResult(4, 1, { drawsAsWhite: 1, drawsAsBlack: 1 })
    const r2ResultP2 = createTournamentResult(2, 0.5, { lossesAsBlack: 1, drawsAsBlack: 1 })

    model.upsertTournamentResult.mockResolvedValueOnce(r2ResultP4).mockResolvedValueOnce(r2ResultP2)
    model.findTournamentResults.mockResolvedValue([r2ResultP1, r2ResultP3, r2ResultP4, r2ResultP2])

    await gameService.submitGameResult({ gameId: '4', result: GameResultInput.DRAW }, 1)

    // ── CERRAR TORNEO ──
    model.findTournamentById.mockResolvedValue(mockTournament)

    const finalResults = [
      { ...r2ResultP1, finalPosition: 1 },
      { ...r2ResultP3, finalPosition: 2 },
      { ...r2ResultP4, finalPosition: 3 },
      { ...r2ResultP2, finalPosition: 4 },
    ]

    model.findTournamentResults.mockResolvedValue(finalResults)

    const closedTournament = { ...mockTournament, status: TournamentStatus.finished }
    tournamentModelMocked.closeTournamentInDb.mockResolvedValue(closedTournament as unknown as ReturnType<typeof tournamentModelMocked.closeTournamentInDb>)

    const result = await gameService.closeTournament(1, 1)

    expect(result.tournament.status).toBe(TournamentStatus.finished)
    expect(result.finalStandings.entries).toHaveLength(4)
    expect(result.finalStandings.entries[0].position).toBe(1)
    expect(result.finalStandings.entries[0].points).toBe(1.5)
    expect(result.finalStandings.entries[1].position).toBe(2)
    expect(result.finalStandings.entries[1].points).toBe(1)
    expect(result.finalStandings.entries[2].position).toBe(3)
    expect(result.finalStandings.entries[2].points).toBe(1)
    expect(result.finalStandings.entries[3].position).toBe(4)
    expect(result.finalStandings.entries[3].points).toBe(0.5)
  })

  it('la clasificación acumula puntos correctamente entre rondas: victoria en R1 (1pt) + tablas en R2 (0.5pt) = 1.5pt total', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockReferee)

    // Simular R1: Jugador 1 (blancas) gana contra Jugador 2
    const r1Game = createGameWithRelations({
      id: 1,
      roundNumber: 1,
      whitePlayerId: 1,
      blackPlayerId: 2,
      result: GameResult.white_wins,
    })

    model.findGameById.mockResolvedValue(r1Game)
    model.updateGameResult.mockResolvedValue(r1Game)
    model.findGamesByTournament.mockResolvedValue([r1Game])

    const r1ResultP1 = createTournamentResult(1, 1, { winsAsWhite: 1 })
    const r1ResultP2 = createTournamentResult(2, 0, { lossesAsBlack: 1 })

    model.upsertTournamentResult.mockResolvedValueOnce(r1ResultP1).mockResolvedValueOnce(r1ResultP2)
    model.updateFinalPositions.mockResolvedValue(undefined)
    model.findConfirmedRegistrationsByTournament.mockResolvedValue(
      mockPlayers.slice(0, 2).map((p) => ({ player: { userId: p.userId } })),
    )
    model.findTournamentResults.mockResolvedValue([r1ResultP1])

    await gameService.submitGameResult({ gameId: '1', result: GameResultInput.WHITE_WINS }, 1)

    expect(model.upsertTournamentResult).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: 1,
        tournamentId: 1,
        points: 1,
        winsAsWhite: 1,
      }),
    )

    // Simular R2: Jugador 1 (blancas) empata contra Jugador 3
    const r2Game = createGameWithRelations({
      id: 2,
      roundNumber: 2,
      whitePlayerId: 1,
      blackPlayerId: 3,
      result: GameResult.draw,
    })

    model.findGameById.mockResolvedValue(r2Game)
    model.updateGameResult.mockResolvedValue(r2Game)
    model.findGamesByTournament.mockResolvedValue([r1Game, r2Game])

    const r2ResultP1 = createTournamentResult(1, 1.5, { winsAsWhite: 1, drawsAsWhite: 1 })
    const r2ResultP3 = createTournamentResult(3, 0.5, { drawsAsBlack: 1 })

    model.upsertTournamentResult.mockResolvedValueOnce(r2ResultP1).mockResolvedValueOnce(r2ResultP3)
    model.findTournamentResults.mockResolvedValue([r2ResultP1])

    await gameService.submitGameResult({ gameId: '2', result: GameResultInput.DRAW }, 1)

    // Verificar que la acumulación de puntos es correcta: 1 + 0.5 = 1.5
    expect(model.upsertTournamentResult).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: 1,
        tournamentId: 1,
        points: 1.5,
        winsAsWhite: 1,
        drawsAsWhite: 1,
      }),
    )
  })

  it('el jugador con bye recibe 1 punto automáticamente sin registrar resultado', async () => {
    const threePlayerTournament = { ...mockTournament, currentRound: 0 }

    model.findTournamentById.mockResolvedValue(threePlayerTournament)
    model.findUserById.mockResolvedValue(mockReferee)

    const threePlayers = mockPlayers.slice(0, 3)
    model.findConfirmedPlayersWithElo.mockResolvedValue(threePlayers)
    model.findGamesByTournament.mockResolvedValue([])
    model.findTournamentResults.mockResolvedValue([])
    model.countPendingResultsInRound.mockResolvedValue(0)

    pairings.generateSwissPairings.mockReturnValue([
      { whitePlayerId: 1, blackPlayerId: 2, tableNumber: 1, isBye: false },
      { byePlayerId: 3, tableNumber: 2, isBye: true },
    ])

    const normalGame = createGameWithRelations({ id: 1, roundNumber: 1, whitePlayerId: 1, blackPlayerId: 2 })
    const byeGame = createByeGameWithRelations({ id: 2, roundNumber: 1, byePlayerId: 3, tableNumber: 2 })

    model.createGame.mockResolvedValue(normalGame)
    model.createByeGame.mockResolvedValue(byeGame)

    const byeResult = createTournamentResult(3, 1)
    model.upsertTournamentResult.mockResolvedValue(byeResult)

    model.updateTournamentCurrentRound.mockResolvedValue(undefined)
    model.findConfirmedRegistrationsByTournament.mockResolvedValue(
      threePlayers.map((p) => ({ player: { userId: p.userId } })),
    )

    await gameService.publishPairings(1, 1)

    // Verificar que el jugador con bye recibió 1 punto automáticamente
    expect(model.upsertTournamentResult).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: 3,
        tournamentId: 1,
        points: 1,
      }),
    )

    // Verificar que se creó un byeGame con resultado automático
    expect(model.createByeGame).toHaveBeenCalledWith(
      expect.objectContaining({
        tournamentId: 1,
        roundNumber: 1,
        byePlayerId: 3,
        tableNumber: 2,
      }),
    )
  })
})
