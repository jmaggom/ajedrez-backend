import { Role, TournamentStatus, GameResult } from '@prisma/client'
import * as gameService from '../../game.service'
import * as gameModel from '../../game.model'
import * as gamePairings from '../../game.pairings'
import { sendPushNotification } from '../../../../common/notification/notification.service'
import type { GameWithRelations, TournamentResultWithRelations } from '../../game.types'
import * as tournamentModel from '../../../tournament/tournament.model'

jest.mock('../../game.model')
jest.mock('../../game.pairings')
jest.mock('../../../tournament/tournament.model')
jest.mock('../../../../common/notification/notification.service', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
}))

const model = gameModel as jest.Mocked<typeof gameModel>
const pairings = gamePairings as jest.Mocked<typeof gamePairings>
const tournamentModelMocked = tournamentModel as jest.Mocked<typeof tournamentModel>
const mockedSendPush = sendPushNotification as jest.Mock

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

const mockTournamentFinished = {
  ...mockTournament,
  status: TournamentStatus.finished,
}

const mockReferee = { id: 1, role: 'referee', clubId: null }
const mockDelegate = { id: 2, role: 'delegate', clubId: 1 }
const mockDelegateOtherClub = { id: 3, role: 'delegate', clubId: 99 }
const mockPlayer = { id: 4, role: 'player', clubId: null }

const mockPlayerData = [
  { playerId: 1, userId: 10, fideClassical: 1800, fideId: null, fullName: 'Jugador 1' },
  { playerId: 2, userId: 20, fideClassical: 1750, fideId: null, fullName: 'Jugador 2' },
  { playerId: 3, userId: 30, fideClassical: 1700, fideId: null, fullName: 'Jugador 3' },
  { playerId: 4, userId: 40, fideClassical: 1650, fideId: null, fullName: 'Jugador 4' },
]

const mockPlayerDataOdd = mockPlayerData.slice(0, 3) // 3 jugadores → número impar

const mockGameBase: GameWithRelations = {
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
    user: { fullName: 'Jugador 1' },
    elo: { fadaClassical: 1750, fideClassical: 1800 },
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
    user: { fullName: 'Jugador 2' },
    elo: { fadaClassical: 1680, fideClassical: 1750 },
  },
  byePlayer: null,
  registeredBy: null,
}

const mockGameBye: GameWithRelations = {
  ...mockGameBase,
  id: 2,
  isBye: true,
  tableNumber: 2,
  whitePlayerId: null,
  blackPlayerId: null,
  byePlayerId: 3,
  result: GameResult.bye,
  whitePlayer: null,
  blackPlayer: null,
  byePlayer: {
    id: 3,
    userId: 30,
    birthDate: new Date('2000-03-01'),
    NIF: '11111111C',
    fideId: null,
    federation: null,
    clubId: null,
    eloId: 3,
    joinedAt: new Date('2025-01-01'),
    leftAt: null,
    lastLatitude: null,
    lastLongitude: null,
    lastLocationAt: null,
    user: { fullName: 'Jugador 3' },
    elo: { fadaClassical: 1650, fideClassical: 1700 },
  },
}

const mockTournamentResult: TournamentResultWithRelations = {
  id: 1,
  playerId: 1,
  tournamentId: 1,
  finalPosition: 1,
  points: 0,
  winsAsWhite: 0,
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
    user: { fullName: 'Jugador 1' },
    elo: { fadaClassical: 1750, fideClassical: 1800 },
  },
}

const mockConfirmedRegistrations = [
  { player: { userId: 10 } },
  { player: { userId: 20 } },
  { player: { userId: 30 } },
  { player: { userId: 40 } },
]

// ── publishPairings ───────────────────────────────────────────────────────────

describe('publishPairings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lanza NOT_FOUND si el torneo no existe', async () => {
    model.findTournamentById.mockResolvedValue(null)

    await expect(gameService.publishPairings(99, 1)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } }),
    )
  })

  it('lanza FORBIDDEN si el usuario es player', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockPlayer)

    await expect(gameService.publishPairings(1, 4)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } }),
    )
  })

  it('lanza FORBIDDEN si el usuario es delegate de un club diferente al organizador', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockDelegateOtherClub)

    await expect(gameService.publishPairings(1, 3)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } }),
    )
  })

  it('lanza error PENDING_RESULTS si hay resultados pendientes en la ronda anterior (ronda > 1)', async () => {
    const tournamentR2 = { ...mockTournament, currentRound: 1 }
    model.findTournamentById.mockResolvedValue(tournamentR2)
    model.findUserById.mockResolvedValue(mockReferee)
    model.countPendingResultsInRound.mockResolvedValue(2)

    await expect(gameService.publishPairings(1, 1)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'PENDING_RESULTS' } }),
    )
  })

  describe('con número PAR de jugadores', () => {
    beforeEach(() => {
      model.findTournamentById.mockResolvedValue(mockTournament)
      model.findUserById.mockResolvedValue(mockReferee)
      model.countPendingResultsInRound.mockResolvedValue(0)
      model.findConfirmedPlayersWithElo.mockResolvedValue(mockPlayerData)
      model.findGamesByTournament.mockResolvedValue([])
      model.findTournamentResults.mockResolvedValue([])
      model.updateTournamentCurrentRound.mockResolvedValue(undefined)
      model.findConfirmedRegistrationsByTournament.mockResolvedValue(mockConfirmedRegistrations)
    })

    it('genera 2 pares sin BYE, asigna mesas correctamente', async () => {
      // generateSwissPairings devuelve 2 pares normales
      pairings.generateSwissPairings.mockReturnValue([
        { whitePlayerId: 1, blackPlayerId: 2, tableNumber: 1, isBye: false },
        { whitePlayerId: 3, blackPlayerId: 4, tableNumber: 2, isBye: false },
      ])

      const game1 = { ...mockGameBase, id: 1, tableNumber: 1 }
      const game2 = { ...mockGameBase, id: 2, whitePlayerId: 3, blackPlayerId: 4, tableNumber: 2 }
      model.createGame.mockResolvedValueOnce(game1).mockResolvedValueOnce(game2)

      const result = await gameService.publishPairings(1, 1)

      expect(result.roundNumber).toBe(1)
      expect(result.pairings).toHaveLength(2)
      expect(result.pairings[0].isBye).toBe(false)
      expect(result.pairings[1].isBye).toBe(false)
      expect(model.createGame).toHaveBeenCalledTimes(2)
    })
  })

  describe('con número IMPAR de jugadores', () => {
    beforeEach(() => {
      model.findTournamentById.mockResolvedValue(mockTournament)
      model.findUserById.mockResolvedValue(mockReferee)
      model.countPendingResultsInRound.mockResolvedValue(0)
      model.findConfirmedPlayersWithElo.mockResolvedValue(mockPlayerDataOdd)
      model.findGamesByTournament.mockResolvedValue([])
      model.findTournamentResults.mockResolvedValue([mockTournamentResult])
      model.updateTournamentCurrentRound.mockResolvedValue(undefined)
      model.findConfirmedRegistrationsByTournament.mockResolvedValue(
        mockConfirmedRegistrations.slice(0, 3),
      )
    })

    it('genera 1 par + 1 BYE, el jugador de BYE recibe punto automático', async () => {
      pairings.generateSwissPairings.mockReturnValue([
        { whitePlayerId: 1, blackPlayerId: 2, tableNumber: 1, isBye: false },
        { byePlayerId: 3, tableNumber: 2, isBye: true },
      ])

      const game1 = { ...mockGameBase, id: 1, tableNumber: 1 }
      model.createGame.mockResolvedValue(game1)
      model.createByeGame.mockResolvedValue(mockGameBye)
      model.upsertTournamentResult.mockResolvedValue(mockTournamentResult)

      const result = await gameService.publishPairings(1, 1)

      expect(result.roundNumber).toBe(1)
      expect(result.pairings).toHaveLength(2)
      expect(result.pairings[0].isBye).toBe(false)
      expect(result.pairings[1].isBye).toBe(true)

      // Verificar que se llamó a upsertTournamentResult con +1 punto para el jugador BYE
      expect(model.upsertTournamentResult).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 3,
          tournamentId: 1,
          points: 1, // 0 puntos actuales + 1 por BYE
        }),
      )
    })
  })

  it('llama a sendPushNotification (via Promise.allSettled) para cada jugador', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockReferee)
    model.countPendingResultsInRound.mockResolvedValue(0)
    model.findConfirmedPlayersWithElo.mockResolvedValue(mockPlayerData)
    model.findGamesByTournament.mockResolvedValue([])
    model.findTournamentResults.mockResolvedValue([])
    model.updateTournamentCurrentRound.mockResolvedValue(undefined)
    model.findConfirmedRegistrationsByTournament.mockResolvedValue(mockConfirmedRegistrations)

    pairings.generateSwissPairings.mockReturnValue([
      { whitePlayerId: 1, blackPlayerId: 2, tableNumber: 1, isBye: false },
      { whitePlayerId: 3, blackPlayerId: 4, tableNumber: 2, isBye: false },
    ])

    const game1 = { ...mockGameBase, id: 1, tableNumber: 1 }
    const game2 = { ...mockGameBase, id: 2, whitePlayerId: 3, blackPlayerId: 4, tableNumber: 2 }
    model.createGame.mockResolvedValueOnce(game1).mockResolvedValueOnce(game2)

    await gameService.publishPairings(1, 1)

    // 2 pares × 2 jugadores = 4 notificaciones
    expect(mockedSendPush).toHaveBeenCalledTimes(4)
  })
})

// ── closeTournament ───────────────────────────────────────────────────────────

describe('closeTournament', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lanza NOT_FOUND si el torneo no existe', async () => {
    model.findTournamentById.mockResolvedValue(null)

    await expect(gameService.closeTournament(99, 1)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } }),
    )
  })

  it('lanza CONFLICT si el torneo ya está en status finished', async () => {
    model.findTournamentById.mockResolvedValue(mockTournamentFinished)

    await expect(gameService.closeTournament(1, 1)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'CONFLICT' } }),
    )
  })

  it('lanza FORBIDDEN si el usuario no tiene permisos', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockPlayer)

    await expect(gameService.closeTournament(1, 4)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } }),
    )
  })

  it('cambia el status del torneo a finished', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockReferee)
    model.findTournamentResults.mockResolvedValue([mockTournamentResult])
    tournamentModelMocked.closeTournamentInDb.mockResolvedValue({ ...mockTournament, status: TournamentStatus.finished } as unknown as ReturnType<typeof tournamentModelMocked.closeTournamentInDb>)
    model.findConfirmedRegistrationsByTournament.mockResolvedValue(mockConfirmedRegistrations)

    await gameService.closeTournament(1, 1)

    expect(tournamentModelMocked.closeTournamentInDb).toHaveBeenCalledWith(1)
  })

  it('devuelve el objeto con { tournament, finalStandings } correctamente', async () => {
    model.findTournamentById.mockResolvedValue(mockTournament)
    model.findUserById.mockResolvedValue(mockReferee)
    model.findTournamentResults.mockResolvedValue([mockTournamentResult])
    const closedTournament = { ...mockTournament, status: TournamentStatus.finished }
    tournamentModelMocked.closeTournamentInDb.mockResolvedValue(closedTournament as unknown as ReturnType<typeof tournamentModelMocked.closeTournamentInDb>)
    model.findConfirmedRegistrationsByTournament.mockResolvedValue(mockConfirmedRegistrations)

    const result = await gameService.closeTournament(1, 1)

    expect(result).toHaveProperty('tournament')
    expect(result).toHaveProperty('finalStandings')
    expect(result.tournament.status).toBe(TournamentStatus.finished)
    expect(result.finalStandings.entries).toHaveLength(1)
  })
})
