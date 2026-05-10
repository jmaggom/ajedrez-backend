import { PaymentStatus, RegistrationStatus, TournamentStatus, Role, NotificationType, LicenseType, LicenseStatus } from '@prisma/client'
import { prismaMock } from '../../../../__tests__/mocks/prisma.mock'
import * as tournamentService from '../../tournament.service'
import * as tournamentModel from '../../tournament.model'
import * as paymentService from '../../../payment/payment.service'
import * as paymentModel from '../../../payment/payment.model'
import { sendPushNotification } from '../../../../common/notification/notification.service'

// Mock de prisma.$transaction — inline para payment.service
const mockTxPaymentReceipt = { update: jest.fn() }
const mockTxRegistration = { update: jest.fn() }
const mockTx = {
  paymentReceipt: mockTxPaymentReceipt,
  registration: mockTxRegistration,
}

jest.mock('../../tournament.model')
jest.mock('../../../payment/payment.model')
jest.mock('../../../../config/database', () => ({
  prisma: {
    $transaction: jest.fn(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx)
    }),
  },
}))
jest.mock('../../../../common/notification/notification.service', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
}))

const tournamentModelMock = tournamentModel as jest.Mocked<typeof tournamentModel>
const paymentModelMock = paymentModel as jest.Mocked<typeof paymentModel>
const mockSendPush = sendPushNotification as jest.Mock

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockTournament = {
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
  availableSlots: 2,
  registrationFee: 1000,
  status: TournamentStatus.open,
  description: null,
  eloEligible: true,
  requirements: {},
  latitude: null,
  longitude: null,
  gpsLocation: null,
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

const mockPlayer1 = {
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
    fadaClassical: 1800,
    fadaRapid: 1750,
    fadaBlitz: 1700,
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

const mockRegistration = {
  id: 1,
  playerId: 100,
  tournamentId: 1,
  status: RegistrationStatus.awaiting_payment,
  paymentStatus: PaymentStatus.pending,
  registeredAt: new Date('2026-05-01T10:00:00Z'),
  method: 'self' as const,
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
      fullName: 'Jugador 1',
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
    availableSlots: 2,
    registrationFee: 1000,
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

const mockPaymentReceipt = {
  id: 1,
  registrationId: 1,
  licenseId: null,
  amount: 1000,
  date: new Date('2026-05-01'),
  status: PaymentStatus.pending,
  fileUrl: '/uploads/receipt.jpg',
  validatedById: null,
  validatedAt: null,
  registration: mockRegistration,
  validatedBy: null,
}

const mockClub = {
  id: 1,
  name: 'Club Test',
  CIF: 'A12345678',
  address: 'Calle Test 123',
  phone: '123456789',
  email: 'club@test.com',
  website: null,
  description: null,
  logoUrl: null,
  shortCode: 'TEST',
  planActivo: false,
  createdAt: new Date('2025-01-01'),
  delegates: [
    {
      id: 1,
      userId: 99,
      user: {
        email: 'delegate@test.com',
        fullName: 'Delegado Test',
        phone: null,
        player: null,
      },
    },
  ],
  players: [],
}

// ── Tests de flujo completo ───────────────────────────────────────────────────

describe('Flujo completo: inscripción → validación de pago', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('jugador se inscribe con fee > 0 → comprobante pendiente → delegado valida → status confirmed', async () => {
    // ARRANGE: Setup de mocks para registerTournament
    tournamentModelMock.findTournamentById.mockResolvedValue(mockTournament)
    tournamentModelMock.findPlayerWithEloAndLicenses.mockResolvedValue(mockPlayer1)
    tournamentModelMock.findRegistration.mockResolvedValue(null)
    tournamentModelMock.countActiveRegistrations.mockResolvedValue(0)
    tournamentModelMock.createRegistration.mockResolvedValue(mockRegistration)

    // ACT 1: Inscripción
    const registerResult = await tournamentService.registerTournament(1, 10)

    // ASSERT 1: Inscripción creada con status awaiting_payment
    expect(registerResult.registration.status).toBe(RegistrationStatus.awaiting_payment)
    expect(tournamentModelMock.createRegistration).toHaveBeenCalledWith(100, 1, RegistrationStatus.awaiting_payment)

    // ARRANGE: Setup de mocks para validatePayment
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.pending,
    })
    paymentModelMock.validatePaymentTransaction.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.validated,
    })

    // ACT 2: Delegado valida el pago
    await paymentService.validatePayment(1, 99)

    // ASSERT 2: Se envió notificación al jugador
    expect(mockSendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        type: NotificationType.payment,
        title: 'Pago validado',
      }),
    )
  })

  it('comprobante rechazado → status cancelled → notificaciones a TournamentNotifyRequest', async () => {
    // ARRANGE: Setup de mocks para rejectPayment
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.pending,
    })
    paymentModelMock.rejectPaymentTransaction.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.rejected,
    })
    tournamentModelMock.findNotifyRequests.mockResolvedValue([
      { userId: 20 },
      { userId: 30 },
    ])

    // ACT: Delegado rechaza el pago
    await paymentService.rejectPayment(1, 99, 'Comprobante ilegible')

    // ASSERT 1: Se notificó al jugador rechazado
    expect(mockSendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        type: NotificationType.payment,
        title: 'Pago rechazado',
      }),
    )

    // ASSERT 2: Se notificó a los usuarios en la lista de espera
    expect(mockSendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 20,
        type: NotificationType.tournament,
        title: 'Plaza disponible',
      }),
    )
    expect(mockSendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 30,
        type: NotificationType.tournament,
        title: 'Plaza disponible',
      }),
    )
  })

  it('torneo lleno → jugador pide aviso → se libera plaza → recibe notificación', async () => {
    // ARRANGE: Torneo lleno
    const fullTournament = {
      ...mockTournament,
      availableSlots: 1,
    }
    tournamentModelMock.findTournamentById.mockResolvedValue(fullTournament)
    tournamentModelMock.countActiveRegistrations.mockResolvedValue(1) // torneo lleno
    tournamentModelMock.createNotifyRequest.mockResolvedValue(undefined as never)

    // ACT 1: Jugador 2 pide aviso cuando el torneo está lleno
    const notifyResult = await tournamentService.requestTournamentNotification(1, 20)

    // ASSERT 1: Se creó el notify request
    expect(notifyResult.isRequested).toBe(true)
    expect(tournamentModelMock.createNotifyRequest).toHaveBeenCalledWith(20, 1)

    // ARRANGE: Setup para cancelRegistration
    const registrationToCancel = {
      ...mockRegistration,
      status: RegistrationStatus.confirmed,
      player: {
        ...mockRegistration.player,
        userId: 10,
      },
      tournament: fullTournament,
    }
    const delegateUser = {
      id: 99,
      role: Role.delegate,
      clubId: 1,
    }
    tournamentModelMock.findRegistrationById.mockResolvedValue(registrationToCancel)
    tournamentModelMock.findUserWithRole.mockResolvedValue(delegateUser)
    tournamentModelMock.updateRegistrationStatus.mockResolvedValue({
      ...registrationToCancel,
      status: RegistrationStatus.cancelled,
    })
    tournamentModelMock.findNotifyRequests.mockResolvedValue([
      { userId: 20 },
    ])

    jest.clearAllMocks() // limpiar las llamadas anteriores

    // ACT 2: Delegado cancela una inscripción
    await tournamentService.cancelRegistration(1, 99)

    // ASSERT 2: Se notificó al jugador en lista de espera
    expect(mockSendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 20,
        type: NotificationType.tournament,
        title: 'Plaza disponible',
        message: expect.stringContaining('Se ha liberado una plaza'),
      }),
    )
  })
})
