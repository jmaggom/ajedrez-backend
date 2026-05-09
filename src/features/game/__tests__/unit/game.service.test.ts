import { GameResult, Role, TournamentStatus } from '@prisma/client'
import * as gameService from '../../game.service'
import * as gameModel from '../../game.model'
import * as gamePairings from '../../game.pairings'
import * as tournamentModel from '../../../tournament/tournament.model'
import * as notificationService from '../../../../common/notification/notification.service'
import { GameResultInput } from '../../game.types'
import type { GameWithRelations, TournamentResultWithRelations } from '../../game.types'

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
  eloEligible: true,
  organizerId: 1,
  status: TournamentStatus.open,
  rounds: 5,
  currentRound: 0,
}

const mockTournamentNonElo = {
  ...mockTournament,
  eloEligible: false,
}

const mockReferee = { id: 1, role: 'referee', clubId: null }
const mockDelegate = { id: 2, role: 'delegate', clubId: 1 }
const mockDelegateOtherClub = { id: 3, role: 'delegate', clubId: 99 }
const mockPlayer = { id: 4, role: 'player', clubId: null }

const mockGame: GameWithRelations = {
  id: 1,
  tournamentId: 1,
  roundNumber: 1,
  tableNumber: 1,
  isBye: false,
  whitePlayerId: 1,
  blackPlayerId: 2,
  byePlayerId: null,
  result: null,
  moves: null,
  notes: null,
  durationSeconds: null,
  eloEligible: true,
  registeredById: null,
  whitePlayer: {
    id: 1,
    userId: 10,
    birthDate: new Date('2000-01-01'),
    NIF: '12345678A',
    fideId: null,
    federation: null,
    clubId: null,
    eloId: 1,
    joinedAt: new Date('2025-01-01'),
    leftAt: null,
    lastLatitude: null,
    lastLongitude: null,
    lastLocationAt: null,
    user: { fullName: 'Jugador Blancas' },
    elo: {
      fadaClassical: 1750,
      fideClassical: 1800,
    },
  },
  blackPlayer: {
    id: 2,
    userId: 20,
    birthDate: new Date('2000-02-01'),
    NIF: '87654321B',
    fideId: null,
    federation: null,
    clubId: null,
    eloId: 2,
    joinedAt: new Date('2025-01-01'),
    leftAt: null,
    lastLatitude: null,
    lastLongitude: null,
    lastLocationAt: null,
    user: { fullName: 'Jugador Negras' },
    elo: {
      fadaClassical: 1680,
      fideClassical: 1700,
    },
  },
  byePlayer: null,
  registeredBy: null,
}

const mockGameWithResult: GameWithRelations = {
  ...mockGame,
  result: GameResult.white_wins,
}

const mockTournamentResult: TournamentResultWithRelations = {
  id: 1,
  playerId: 1,
  tournamentId: 1,
  finalPosition: 1,
  points: 1,
  winsAsWhite: 1,
  drawsAsWhite: 0,
  lossesAsWhite: 0,
  winsAsBlack: 0,
  drawsAsBlack: 0,
  lossesAsBlack: 0,
  performanceRating: null,
  eloEligible: true,
  isFideRated: false,
  isFadaRated: false,
  eloChangeFide: null,
  eloChangeFada: null,
  eloChangeOnline: null,
  player: {
    id: 1,
    userId: 10,
    birthDate: new Date('2000-01-01'),
    NIF: '12345678A',
    fideId: null,
    federation: null,
    clubId: null,
    eloId: 1,
    joinedAt: new Date('2025-01-01'),
    leftAt: null,
    lastLatitude: null,
    lastLongitude: null,
    lastLocationAt: null,
    user: { fullName: 'Jugador Blancas' },
    elo: {
      fadaClassical: 1750,
      fideClassical: 1800,
    },
  },
}

// ── getTournamentGames ────────────────────────────────────────────────────────

describe('getTournamentGames', () => {
  it('devuelve lista de partidas del torneo', async () => {
    model.findGamesByTournament.mockResolvedValue([mockGame])

    const result = await gameService.getTournamentGames(1)

    expect(result).toEqual([mockGame])
  })

  it('filtra por ronda si se pasa roundNumber', async () => {
    model.findGamesByTournament.mockResolvedValue([mockGame])

    await gameService.getTournamentGames(1, 2)

    expect(model.findGamesByTournament).toHaveBeenCalledWith(1, 2)
  })

  it('devuelve array vacío si no hay partidas', async () => {
    model.findGamesByTournament.mockResolvedValue([])

    const result = await gameService.getTournamentGames(1)

    expect(result).toEqual([])
  })
})

// ── getTournamentStandings ────────────────────────────────────────────────────

describe('getTournamentStandings', () => {
  it('lanza NOT_FOUND si el torneo no existe', async () => {
    model.findTournamentById.mockResolvedValue(null)

    await expect(gameService.getTournamentStandings(99)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } }),
    )
  })

  it('devuelve standings con entries vacías si no hay resultados registrados', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findTournamentResults.mockResolvedValue([])

    const result = await gameService.getTournamentStandings(1)

    expect(result.entries).toEqual([])
  })

  it('devuelve standings correctos con totalGames calculado correctamente', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findTournamentResults.mockResolvedValue([mockTournamentResult])

    const result = await gameService.getTournamentStandings(1)

    expect(result.entries[0].gamesPlayed).toBe(1)
    expect(result.entries[0].wins).toBe(1)
    expect(result.entries[0].points).toBe(1)
  })
})

// ── createGame ────────────────────────────────────────────────────────────────

describe('createGame', () => {
  const createGameInput = {
    tournamentId: '1',
    roundNumber: 1,
    whitePlayerId: '1',
    blackPlayerId: '2',
  }

  it('lanza NOT_FOUND si el torneo no existe', async () => {
    model.findTournamentById.mockResolvedValue(null)

    await expect(gameService.createGame(createGameInput, 1)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } }),
    )
  })

  it('lanza FORBIDDEN si el rol es player', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockPlayer)

    await expect(gameService.createGame(createGameInput, 4)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } }),
    )
  })

  it('lanza FORBIDDEN si es delegate de un club diferente al organizador', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockDelegateOtherClub)

    await expect(gameService.createGame(createGameInput, 3)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } }),
    )
  })

  it('crea la partida si el rol es referee', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockReferee)
    model.createGame.mockResolvedValue(mockGame)

    const result = await gameService.createGame(createGameInput, 1)

    expect(result).toEqual(mockGame)
  })

  it('crea la partida si es delegate del club organizador', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockDelegate)
    model.createGame.mockResolvedValue(mockGame)

    const result = await gameService.createGame(createGameInput, 2)

    expect(result).toEqual(mockGame)
  })
})

// ── submitGameResult ──────────────────────────────────────────────────────────

describe('submitGameResult', () => {
  const submitInput = { gameId: '1', result: GameResultInput.WHITE_WINS }

  it('lanza NOT_FOUND si la partida no existe', async () => {
    model.findGameById.mockResolvedValue(null)

    await expect(gameService.submitGameResult(submitInput, 1)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } }),
    )
  })

  it('lanza NOT_FOUND si el torneo no existe', async () => {
    model.findGameById.mockResolvedValue(mockGame)
    model.findTournamentById.mockResolvedValue(null)

    await expect(gameService.submitGameResult(submitInput, 1)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } }),
    )
  })

  describe('torneo eloEligible = true', () => {
    beforeEach(() => {
      model.findGameById.mockResolvedValue(mockGame)
      model.findTournamentById.mockResolvedValue(mockTournament)
    })

    it('lanza FORBIDDEN si el rol es delegate', async () => {
      model.findUserById.mockResolvedValue(mockDelegate)

      await expect(gameService.submitGameResult(submitInput, 2)).rejects.toThrow(
        expect.objectContaining({ extensions: { code: 'FORBIDDEN' } }),
      )
    })

    it('lanza FORBIDDEN si el rol es player', async () => {
      model.findUserById.mockResolvedValue(mockPlayer)

      await expect(gameService.submitGameResult(submitInput, 4)).rejects.toThrow(
        expect.objectContaining({ extensions: { code: 'FORBIDDEN' } }),
      )
    })

    it('permite registrar si el rol es referee', async () => {
      model.findUserById.mockResolvedValue(mockReferee)
      model.updateGameResult.mockResolvedValue(mockGameWithResult)
      model.findGamesByTournament.mockResolvedValue([mockGameWithResult])
      model.upsertTournamentResult.mockResolvedValue(mockTournamentResult)
      model.updateFinalPositions.mockResolvedValue(undefined)
      model.findConfirmedRegistrationsByTournament.mockResolvedValue([])
      model.findTournamentResults.mockResolvedValue([mockTournamentResult])

      const result = await gameService.submitGameResult(submitInput, 1)

      expect(result.game).toEqual(mockGameWithResult)
    })
  })

  describe('torneo eloEligible = false', () => {
    beforeEach(() => {
      model.findGameById.mockResolvedValue(mockGame)
      model.findTournamentById.mockResolvedValue(mockTournamentNonElo)
    })

    it('lanza FORBIDDEN si es delegate de otro club', async () => {
      model.findUserById.mockResolvedValue(mockDelegateOtherClub)

      await expect(gameService.submitGameResult(submitInput, 3)).rejects.toThrow(
        expect.objectContaining({ extensions: { code: 'FORBIDDEN' } }),
      )
    })

    it('permite registrar si es referee', async () => {
      model.findUserById.mockResolvedValue(mockReferee)
      model.updateGameResult.mockResolvedValue(mockGameWithResult)
      model.findGamesByTournament.mockResolvedValue([mockGameWithResult])
      model.upsertTournamentResult.mockResolvedValue(mockTournamentResult)
      model.updateFinalPositions.mockResolvedValue(undefined)
      model.findConfirmedRegistrationsByTournament.mockResolvedValue([])
      model.findTournamentResults.mockResolvedValue([mockTournamentResult])

      const result = await gameService.submitGameResult(submitInput, 1)

      expect(result.game).toEqual(mockGameWithResult)
    })

    it('permite registrar si es delegate del club organizador', async () => {
      model.findUserById.mockResolvedValue(mockDelegate)
      model.updateGameResult.mockResolvedValue(mockGameWithResult)
      model.findGamesByTournament.mockResolvedValue([mockGameWithResult])
      model.upsertTournamentResult.mockResolvedValue(mockTournamentResult)
      model.updateFinalPositions.mockResolvedValue(undefined)
      model.findConfirmedRegistrationsByTournament.mockResolvedValue([])
      model.findTournamentResults.mockResolvedValue([mockTournamentResult])

      const result = await gameService.submitGameResult(submitInput, 2)

      expect(result.game).toEqual(mockGameWithResult)
    })
  })

  describe('tras registrar resultado', () => {
    beforeEach(() => {
      model.findGameById.mockResolvedValue(mockGame)
      model.findTournamentById.mockResolvedValue(mockTournament)
      model.findUserById.mockResolvedValue(mockReferee)
      model.updateGameResult.mockResolvedValue(mockGameWithResult)
      model.findGamesByTournament.mockResolvedValue([mockGameWithResult])
      model.upsertTournamentResult.mockResolvedValue(mockTournamentResult)
      model.updateFinalPositions.mockResolvedValue(undefined)
      model.findConfirmedRegistrationsByTournament.mockResolvedValue([])
      model.findTournamentResults.mockResolvedValue([mockTournamentResult])
    })

    it('llama a updateGameResult con los parámetros correctos', async () => {
      await gameService.submitGameResult(submitInput, 1)

      expect(model.updateGameResult).toHaveBeenCalledWith(1, GameResult.white_wins, 1)
    })

    it('llama a recalculateTournamentResults — verificado mediante upsertTournamentResult', async () => {
      await gameService.submitGameResult(submitInput, 1)

      expect(model.upsertTournamentResult).toHaveBeenCalled()
    })

    it('devuelve { game, standings }', async () => {
      const result = await gameService.submitGameResult(submitInput, 1)

      expect(result).toHaveProperty('game')
      expect(result).toHaveProperty('standings')
    })

    it('recalcula TournamentResult tras registrar resultado', async () => {
      await gameService.submitGameResult(submitInput, 1)

      expect(model.upsertTournamentResult).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 1,
          tournamentId: 1,
          points: 1,
          winsAsWhite: 1,
        }),
      )
    })

    it('un resultado WHITE_WINS suma 1 punto al jugador de blancas y 0 al de negras', async () => {
      const mockResultBlackPlayer = {
        ...mockTournamentResult,
        id: 2,
        playerId: 2,
        points: 0,
        winsAsWhite: 0,
        lossesAsBlack: 1,
      }

      model.upsertTournamentResult
        .mockResolvedValueOnce(mockTournamentResult)
        .mockResolvedValueOnce(mockResultBlackPlayer)

      await gameService.submitGameResult(submitInput, 1)

      // Verificar que se hizo upsert para ambos jugadores
      expect(model.upsertTournamentResult).toHaveBeenCalledTimes(2)

      // Jugador blancas: 1 punto, 1 victoria
      expect(model.upsertTournamentResult).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 1,
          points: 1,
          winsAsWhite: 1,
        }),
      )

      // Jugador negras: 0 puntos, 1 derrota
      expect(model.upsertTournamentResult).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 2,
          points: 0,
          lossesAsBlack: 1,
        }),
      )
    })
  })
})

// ── publishPairings — flujos completos ────────────────────────────────────────

describe('publishPairings — flujos completos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('flujo completo R1: 8 jugadores confirmados → publishPairings → 4 cruces creados + notificaciones enviadas', async () => {
    const mockTournamentR1 = { ...mockTournament, currentRound: 0 }

    const eightPlayers = Array.from({ length: 8 }, (_, i) => ({
      playerId: i + 1,
      userId: (i + 1) * 10,
      fideClassical: 2000 - i * 50,
      fideId: null,
      fullName: `Jugador ${i + 1}`,
    }))

    model.findTournamentById.mockResolvedValue(mockTournamentR1)
    model.findUserById.mockResolvedValue(mockReferee)
    model.countPendingResultsInRound.mockResolvedValue(0)
    model.findConfirmedPlayersWithElo.mockResolvedValue(eightPlayers)
    model.findGamesByTournament.mockResolvedValue([])
    model.findTournamentResults.mockResolvedValue([])
    model.updateTournamentCurrentRound.mockResolvedValue(undefined)
    model.findConfirmedRegistrationsByTournament.mockResolvedValue(
      eightPlayers.map((p) => ({ player: { userId: p.userId } })),
    )

    // Mock de generateSwissPairings para 8 jugadores
    pairings.generateSwissPairings.mockReturnValue([
      { whitePlayerId: 1, blackPlayerId: 2, tableNumber: 1, isBye: false },
      { whitePlayerId: 3, blackPlayerId: 4, tableNumber: 2, isBye: false },
      { whitePlayerId: 5, blackPlayerId: 6, tableNumber: 3, isBye: false },
      { whitePlayerId: 7, blackPlayerId: 8, tableNumber: 4, isBye: false },
    ])

    // Mock de createGame para cada cruce
    const games = Array.from({ length: 4 }, (_, i) => ({
      ...mockGame,
      id: i + 1,
      whitePlayerId: i * 2 + 1,
      blackPlayerId: i * 2 + 2,
      tableNumber: i + 1,
    }))
    games.forEach((game) => model.createGame.mockResolvedValueOnce(game))

    const mockedSendPush = jest.mocked(notificationService.sendPushNotification)

    const result = await gameService.publishPairings(1, 1)

    expect(result.roundNumber).toBe(1)
    expect(result.pairings).toHaveLength(4)
    expect(model.createGame).toHaveBeenCalledTimes(4)
    // 4 cruces × 2 jugadores = 8 notificaciones
    expect(mockedSendPush).toHaveBeenCalledTimes(8)
  })

  it('flujo completo con impar: 7 jugadores → 3 cruces + 1 bye + notificación de descanso', async () => {
    const mockTournamentR1 = { ...mockTournament, currentRound: 0 }

    const sevenPlayers = Array.from({ length: 7 }, (_, i) => ({
      playerId: i + 1,
      userId: (i + 1) * 10,
      fideClassical: 2000 - i * 50,
      fideId: null,
      fullName: `Jugador ${i + 1}`,
    }))

    model.findTournamentById.mockResolvedValue(mockTournamentR1)
    model.findUserById.mockResolvedValue(mockReferee)
    model.countPendingResultsInRound.mockResolvedValue(0)
    model.findConfirmedPlayersWithElo.mockResolvedValue(sevenPlayers)
    model.findGamesByTournament.mockResolvedValue([])
    model.findTournamentResults.mockResolvedValue([])
    model.updateTournamentCurrentRound.mockResolvedValue(undefined)
    model.findConfirmedRegistrationsByTournament.mockResolvedValue(
      sevenPlayers.map((p) => ({ player: { userId: p.userId } })),
    )

    pairings.generateSwissPairings.mockReturnValue([
      { whitePlayerId: 1, blackPlayerId: 2, tableNumber: 1, isBye: false },
      { whitePlayerId: 3, blackPlayerId: 4, tableNumber: 2, isBye: false },
      { whitePlayerId: 5, blackPlayerId: 6, tableNumber: 3, isBye: false },
      { byePlayerId: 7, tableNumber: 4, isBye: true },
    ])

    const games = Array.from({ length: 3 }, (_, i) => ({
      ...mockGame,
      id: i + 1,
      whitePlayerId: i * 2 + 1,
      blackPlayerId: i * 2 + 2,
      tableNumber: i + 1,
    }))
    games.forEach((game) => model.createGame.mockResolvedValueOnce(game))

    const mockByeGame = {
      ...mockGame,
      id: 4,
      isBye: true,
      byePlayerId: 7,
      result: GameResult.bye,
      tableNumber: 4,
    }
    model.createByeGame.mockResolvedValue(mockByeGame)
    model.upsertTournamentResult.mockResolvedValue(mockTournamentResult)

    const mockedSendPush = jest.mocked(notificationService.sendPushNotification)

    const result = await gameService.publishPairings(1, 1)

    expect(result.roundNumber).toBe(1)
    expect(result.pairings).toHaveLength(4)
    expect(model.createGame).toHaveBeenCalledTimes(3)
    expect(model.createByeGame).toHaveBeenCalledTimes(1)
    // 3 cruces × 2 jugadores + 1 bye = 7 notificaciones
    expect(mockedSendPush).toHaveBeenCalledTimes(7)
    // Verificar que el jugador con bye recibió su notificación específica
    expect(mockedSendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 70,
        message: expect.stringContaining('Descansás en la Ronda 1'),
      }),
    )
  })

  it('no puede publicar R2 si R1 tiene resultados pendientes', async () => {
    const mockTournamentR1Complete = { ...mockTournament, currentRound: 1 }

    model.findTournamentById.mockResolvedValue(mockTournamentR1Complete)
    model.findUserById.mockResolvedValue(mockReferee)
    model.countPendingResultsInRound.mockResolvedValue(2) // 2 resultados pendientes en R1

    await expect(gameService.publishPairings(1, 1)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'PENDING_RESULTS' } }),
    )

    expect(model.countPendingResultsInRound).toHaveBeenCalledWith(1, 1)
  })
})

// ── closeTournament — tests adicionales ──────────────────────────────────────

describe('closeTournament — tests adicionales', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calcula clasificación final correctamente con los resultados registrados', async () => {
    const mockResults = [
      { ...mockTournamentResult, playerId: 1, points: 3, finalPosition: 1 },
      { ...mockTournamentResult, playerId: 2, points: 2, finalPosition: 2 },
      { ...mockTournamentResult, playerId: 3, points: 1, finalPosition: 3 },
    ]

    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockReferee)
    model.findTournamentResults.mockResolvedValue(mockResults)
    tournamentModelMocked.closeTournamentInDb.mockResolvedValue({
      ...mockTournament,
      status: TournamentStatus.finished,
    } as unknown as ReturnType<typeof tournamentModelMocked.closeTournamentInDb>)
    model.findConfirmedRegistrationsByTournament.mockResolvedValue([
      { player: { userId: 10 } },
      { player: { userId: 20 } },
      { player: { userId: 30 } },
    ])

    const result = await gameService.closeTournament(1, 1)

    expect(result.finalStandings.entries).toHaveLength(3)
    expect(result.finalStandings.entries[0].position).toBe(1)
    expect(result.finalStandings.entries[0].points).toBe(3)
    expect(result.finalStandings.entries[1].position).toBe(2)
    expect(result.finalStandings.entries[1].points).toBe(2)
    expect(result.finalStandings.entries[2].position).toBe(3)
    expect(result.finalStandings.entries[2].points).toBe(1)
  })

  it('notifica a todos los inscritos', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockReferee)
    model.findTournamentResults.mockResolvedValue([mockTournamentResult])
    tournamentModelMocked.closeTournamentInDb.mockResolvedValue({
      ...mockTournament,
      status: TournamentStatus.finished,
    } as unknown as ReturnType<typeof tournamentModelMocked.closeTournamentInDb>)

    const mockRegistrations = [
      { player: { userId: 10 } },
      { player: { userId: 20 } },
      { player: { userId: 30 } },
    ]
    model.findConfirmedRegistrationsByTournament.mockResolvedValue(mockRegistrations)

    const mockedSendPush = jest.mocked(notificationService.sendPushNotification)

    await gameService.closeTournament(1, 1)

    expect(mockedSendPush).toHaveBeenCalledTimes(3)
    mockRegistrations.forEach((reg) => {
      expect(mockedSendPush).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: reg.player.userId,
          title: 'Torneo finalizado',
          message: expect.stringContaining('ha finalizado'),
        }),
      )
    })
  })
})
