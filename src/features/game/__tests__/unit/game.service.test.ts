import { GameResult, Role } from '@prisma/client'
import * as gameService from '../../game.service'
import * as gameModel from '../../game.model'
import { GameResultInput } from '../../game.types'
import type { GameWithRelations, TournamentResultWithRelations } from '../../game.types'

jest.mock('../../game.model')
jest.mock('../../../../common/notification/notification.service', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
}))

const model = gameModel as jest.Mocked<typeof gameModel>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockTournament = {
  id: 1,
  name: 'Open Test',
  eloEligible: true,
  organizerId: 1,
  status: 'open',
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
  whitePlayerId: 1,
  blackPlayerId: 2,
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
  })
})
