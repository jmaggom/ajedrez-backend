import { RegistrationStatus, TournamentStatus, Role, LicenseType, LicenseStatus, RegistrationMethod, PaymentStatus } from '@prisma/client'
import * as tournamentService from '../tournament.service'
import * as tournamentModel from '../tournament.model'
import { sendPushNotification } from '../../../common/notification/notification.service'
import type { TournamentWithRelations } from '../tournament.types'

jest.mock('../tournament.model')
jest.mock('../../../common/notification/notification.service', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
}))

const model = tournamentModel as jest.Mocked<typeof tournamentModel>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockTournamentBase: TournamentWithRelations = {
  id: 1,
  name: 'Torneo Test',
  organizerId: 1,
  venue: 'Club Test',
  startDate: new Date('2026-06-01'),
  endDate: new Date('2026-06-02'),
  format: 'Suizo',
  rounds: 5,
  currentRound: 0,
  timeControl: '90+30',
  mode: 'classical',
  availableSlots: 10,
  registrationFee: 0,
  status: TournamentStatus.open,
  description: 'Torneo de prueba',
  eloEligible: true,
  requirements: {
    requireFideId: false,
    requireFadaId: false,
  },
  latitude: null,
  longitude: null,
  notificationRadius: null,
  geoNotificationActive: false,
  organizer: {
    id: 1,
    name: 'Club Test',
    CIF: 'A12345678',
    address: 'Calle Test 123',
    phone: '123456789',
    email: 'club@test.com',
    createdAt: new Date('2025-01-01'),
    logoUrl: null,
    shortCode: 'TEST',
    planActivo: false,
    website: null,
    description: null,
  },
  registrations: [],
}

const mockTournamentWithFee: TournamentWithRelations = {
  ...mockTournamentBase,
  registrationFee: 1000,
}

const mockTournamentNotOpen: TournamentWithRelations = {
  ...mockTournamentBase,
  status: TournamentStatus.draft,
}

const mockPlayer = {
  id: 100,
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
  elo: {
    id: 1,
    fadaClassical: 1780,
    fadaRapid: 1730,
    fadaBlitz: 1680,
    fideClassical: 1800,
    fideRapid: 1750,
    fideBlitz: 1700,
    onlineClassical: 0,
    onlineRapid: 0,
    onlineBlitz: 0,
    fideClassicalGames: 0,
    fideRapidGames: 0,
    fideBlitzGames: 0,
    fadaClassicalGames: 0,
    fadaRapidGames: 0,
    fadaBlitzGames: 0,
    onlineClassicalGames: 0,
    onlineRapidGames: 0,
    onlineBlitzGames: 0,
  },
  licenses: [] as Array<{
    id: number
    playerId: number
    licenseNumber: string
    type: LicenseType
    issuedAt: Date
    expiresAt: Date
    status: LicenseStatus
  }>,
}

const mockUser = {
  id: 10,
  role: Role.player,
  clubId: null,
}

const mockRegistration = {
  id: 1,
  playerId: 100,
  tournamentId: 1,
  status: RegistrationStatus.pending,
  registeredAt: new Date('2026-05-01T10:00:00Z'),
  paymentStatus: PaymentStatus.pending,
  method: RegistrationMethod.self,
  registeredById: null,
  player: {
    id: 100,
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
    user: {
      id: 10,
      email: 'player@test.com',
      password: 'hashed',
      role: Role.player,
      fullName: 'Jugador Test',
      phone: null,
      pushToken: null,
      avatarUrl: null,
      createdAt: new Date('2025-01-01'),
    },
  },
  tournament: {
    id: 1,
    name: 'Torneo Test',
    organizerId: 1,
    venue: 'Club Test',
    gpsLocation: null,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-02'),
    format: 'Suizo',
    rounds: 5,
    currentRound: 0,
    timeControl: '90+30',
    mode: 'classical',
    availableSlots: 10,
    registrationFee: 0,
    status: TournamentStatus.open,
    description: null,
    eloEligible: true,
    requirements: {},
    latitude: null,
    longitude: null,
    notificationRadius: null,
    geoNotificationActive: false,
  },
}

// ── registerTournament ────────────────────────────────────────────────────────

describe('registerTournament', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('cuando hay slots disponibles y fee = 0 → crea con status pending', async () => {
    model.findTournamentById.mockResolvedValue(mockTournamentBase)
    model.findPlayerWithEloAndLicenses.mockResolvedValue(mockPlayer)
    model.findRegistration.mockResolvedValue(null)
    model.countActiveRegistrations.mockResolvedValue(5)
    model.createRegistration.mockResolvedValue({
      ...mockRegistration,
      status: RegistrationStatus.pending,
    })

    const result = await tournamentService.registerTournament(1, 10)

    expect(result.registration.status).toBe(RegistrationStatus.pending)
    expect(model.createRegistration).toHaveBeenCalledWith(100, 1, RegistrationStatus.pending)
  })

  it('cuando hay slots disponibles y fee > 0 → crea con status awaiting_payment', async () => {
    model.findTournamentById.mockResolvedValue(mockTournamentWithFee)
    model.findPlayerWithEloAndLicenses.mockResolvedValue(mockPlayer)
    model.findRegistration.mockResolvedValue(null)
    model.countActiveRegistrations.mockResolvedValue(5)
    model.createRegistration.mockResolvedValue({
      ...mockRegistration,
      status: RegistrationStatus.awaiting_payment,
    })

    const result = await tournamentService.registerTournament(1, 10)

    expect(result.registration.status).toBe(RegistrationStatus.awaiting_payment)
    expect(model.createRegistration).toHaveBeenCalledWith(100, 1, RegistrationStatus.awaiting_payment)
  })

  it('cuando el cupo está completo → lanza error TOURNAMENT_FULL', async () => {
    model.findTournamentById.mockResolvedValue(mockTournamentBase)
    model.findPlayerWithEloAndLicenses.mockResolvedValue(mockPlayer)
    model.findRegistration.mockResolvedValue(null)
    model.countActiveRegistrations.mockResolvedValue(10)

    await expect(tournamentService.registerTournament(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'TOURNAMENT_FULL' } })
    )
  })

  it('cuando el usuario ya está inscrito → lanza error ALREADY_REGISTERED', async () => {
    model.findTournamentById.mockResolvedValue(mockTournamentBase)
    model.findPlayerWithEloAndLicenses.mockResolvedValue(mockPlayer)
    model.findRegistration.mockResolvedValue(mockRegistration)

    await expect(tournamentService.registerTournament(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'ALREADY_REGISTERED' } })
    )
  })

  it('cuando el torneo no está abierto → lanza error TOURNAMENT_NOT_OPEN', async () => {
    model.findTournamentById.mockResolvedValue(mockTournamentNotOpen)

    await expect(tournamentService.registerTournament(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'TOURNAMENT_NOT_OPEN' } })
    )
  })

  it('cuando el torneo no existe → lanza error NOT_FOUND', async () => {
    model.findTournamentById.mockResolvedValue(null)

    await expect(tournamentService.registerTournament(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })

  it('cuando el jugador no tiene perfil → lanza error PLAYER_PROFILE_REQUIRED', async () => {
    model.findTournamentById.mockResolvedValue(mockTournamentBase)
    model.findPlayerWithEloAndLicenses.mockResolvedValue(null)

    await expect(tournamentService.registerTournament(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'PLAYER_PROFILE_REQUIRED' } })
    )
  })
})

// ── cancelRegistration ────────────────────────────────────────────────────────

describe('cancelRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('cancela la inscripción correctamente (status → CANCELLED)', async () => {
    model.findRegistrationById.mockResolvedValue(mockRegistration)
    model.findUserWithRole.mockResolvedValue(mockUser)
    model.updateRegistrationStatus.mockResolvedValue({
      ...mockRegistration,
      status: RegistrationStatus.cancelled,
    })
    model.findNotifyRequests.mockResolvedValue([])

    const result = await tournamentService.cancelRegistration(1, 10)

    expect(result).toBe(true)
    expect(model.updateRegistrationStatus).toHaveBeenCalledWith(1, RegistrationStatus.cancelled)
  })

  it('si hay notify requests, envía push a todos', async () => {
    model.findRegistrationById.mockResolvedValue(mockRegistration)
    model.findUserWithRole.mockResolvedValue(mockUser)
    model.updateRegistrationStatus.mockResolvedValue({
      ...mockRegistration,
      status: RegistrationStatus.cancelled,
    })
    model.findNotifyRequests.mockResolvedValue([{ userId: 20 }, { userId: 30 }])

    const result = await tournamentService.cancelRegistration(1, 10)

    expect(result).toBe(true)
    expect(model.findNotifyRequests).toHaveBeenCalledWith(1)
    expect(sendPushNotification).toHaveBeenCalledTimes(2)
  })

  it('si no hay notify requests, no envía notificaciones', async () => {
    model.findRegistrationById.mockResolvedValue(mockRegistration)
    model.findUserWithRole.mockResolvedValue(mockUser)
    model.updateRegistrationStatus.mockResolvedValue({
      ...mockRegistration,
      status: RegistrationStatus.cancelled,
    })
    model.findNotifyRequests.mockResolvedValue([])

    const result = await tournamentService.cancelRegistration(1, 10)

    expect(result).toBe(true)
    expect(model.findNotifyRequests).toHaveBeenCalledWith(1)
    expect(sendPushNotification).not.toHaveBeenCalled()
  })

  it('jugador no puede cancelar una inscripción CONFIRMED → lanza error FORBIDDEN', async () => {
    model.findRegistrationById.mockResolvedValue({
      ...mockRegistration,
      status: RegistrationStatus.confirmed,
    })
    model.findUserWithRole.mockResolvedValue(mockUser)

    await expect(tournamentService.cancelRegistration(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'CANNOT_CANCEL_CONFIRMED' } })
    )
  })

  it('delegado organizador SÍ puede cancelar una inscripción CONFIRMED', async () => {
    const delegateUser = {
      id: 10,
      role: Role.delegate,
      clubId: 1,
    }
    model.findRegistrationById.mockResolvedValue({
      ...mockRegistration,
      status: RegistrationStatus.confirmed,
    })
    model.findUserWithRole.mockResolvedValue(delegateUser)
    model.updateRegistrationStatus.mockResolvedValue({
      ...mockRegistration,
      status: RegistrationStatus.cancelled,
    })
    model.findNotifyRequests.mockResolvedValue([])

    const result = await tournamentService.cancelRegistration(1, 10)

    expect(result).toBe(true)
    expect(model.updateRegistrationStatus).toHaveBeenCalled()
  })

  it('cuando no existe la inscripción → lanza error NOT_FOUND', async () => {
    model.findRegistrationById.mockResolvedValue(null)

    await expect(tournamentService.cancelRegistration(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })
})
