import { PaymentStatus, RegistrationStatus, NotificationType, Role, TournamentStatus } from '@prisma/client'
import * as clubService from '../club.service'
import * as clubModel from '../club.model'
import * as tournamentModel from '../../tournament/tournament.model'
import { sendPushNotification } from '../../../common/notification/notification.service'
import type { PaymentReceiptWithRelations, ClubWithRelations } from '../club.types'

jest.mock('../club.model')
jest.mock('../../tournament/tournament.model')
jest.mock('../../../common/notification/notification.service', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
}))

const clubModelMock = clubModel as jest.Mocked<typeof clubModel>
const tournamentModelMock = tournamentModel as jest.Mocked<typeof tournamentModel>
const sendPushNotificationMock = sendPushNotification as jest.MockedFunction<typeof sendPushNotification>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockClub: ClubWithRelations = {
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
      userId: 10,
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

const mockPaymentReceipt: PaymentReceiptWithRelations = {
  id: 1,
  registrationId: 100,
  licenseId: null,
  amount: 1000,
  date: new Date('2026-05-01'),
  status: PaymentStatus.pending,
  fileUrl: 'https://example.com/receipt.jpg',
  validatedById: null,
  validatedAt: null,
  registration: {
    id: 100,
    player: {
      id: 200,
      user: {
        id: 500,
        fullName: 'Jugador Test',
      },
    },
    tournament: {
      id: 300,
      name: 'Torneo Test',
      startDate: new Date('2026-06-01'),
      organizerId: 1,
    },
  },
}

const mockPaymentReceiptAlreadyProcessed: PaymentReceiptWithRelations = {
  ...mockPaymentReceipt,
  status: PaymentStatus.validated,
}

const mockPaymentReceiptWrongClub: PaymentReceiptWithRelations = {
  ...mockPaymentReceipt,
  registration: {
    id: 100,
    player: {
      id: 200,
      user: {
        id: 500,
        fullName: 'Jugador Test',
      },
    },
    tournament: {
      id: 300,
      name: 'Torneo Test',
      startDate: new Date('2026-06-01'),
      organizerId: 999,
    },
  },
}

const mockRegistration = {
  id: 100,
  playerId: 200,
  tournamentId: 300,
  status: RegistrationStatus.awaiting_payment,
  paymentStatus: PaymentStatus.pending,
  registeredAt: new Date('2026-05-01T10:00:00Z'),
  method: 'self' as const,
  registeredById: null,
  player: {
    id: 200,
    userId: 500,
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
      id: 500,
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
    id: 300,
    name: 'Torneo Test',
    organizerId: 1,
    venue: 'Club Test',
    gpsLocation: null,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-06-02'),
    format: 'Suizo',
    rounds: 5,
    timeControl: '90+30',
    mode: 'classical',
    availableSlots: 10,
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

// ── validatePayment ───────────────────────────────────────────────────────────

describe('validatePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('actualiza Registration.status = CONFIRMED y paymentStatus = VALIDATED', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    clubModelMock.updatePaymentStatus.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.validated,
    })
    clubModelMock.updateRegistrationPayment.mockResolvedValue(undefined as never)

    await clubService.validatePayment(1, 10)

    expect(clubModelMock.updateRegistrationPayment).toHaveBeenCalledWith(100, {
      status: RegistrationStatus.confirmed,
      paymentStatus: PaymentStatus.validated,
    })
  })

  it('envía push notification al jugador', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    clubModelMock.updatePaymentStatus.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.validated,
    })
    clubModelMock.updateRegistrationPayment.mockResolvedValue(undefined as never)

    await clubService.validatePayment(1, 10)

    expect(sendPushNotificationMock).toHaveBeenCalledWith({
      userId: 500,
      type: NotificationType.payment,
      title: 'Pago validado',
      message: 'Tu comprobante de pago para Torneo Test ha sido validado',
      data: {
        paymentReceiptId: '1',
        tournamentId: '300',
      },
    })
  })

  it('lanza FORBIDDEN si el usuario no es delegado de ningún club', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(null)

    await expect(clubService.validatePayment(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza NOT_FOUND si el comprobante no existe', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(null)

    await expect(clubService.validatePayment(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })

  it('lanza FORBIDDEN si el torneo no es del club del delegado', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceiptWrongClub)

    await expect(clubService.validatePayment(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza CONFLICT si el comprobante ya fue procesado', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceiptAlreadyProcessed)

    await expect(clubService.validatePayment(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'CONFLICT' } })
    )
  })
})

// ── rejectPayment ─────────────────────────────────────────────────────────────

describe('rejectPayment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('actualiza Registration.status = CANCELLED y paymentStatus = REJECTED', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    clubModelMock.updatePaymentStatus.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.rejected,
    })
    clubModelMock.updateRegistrationPayment.mockResolvedValue(undefined as never)
    tournamentModelMock.findNotifyRequests.mockResolvedValue([])

    await clubService.rejectPayment(1, 10, 'Comprobante ilegible')

    expect(clubModelMock.updateRegistrationPayment).toHaveBeenCalledWith(100, {
      status: RegistrationStatus.cancelled,
      paymentStatus: PaymentStatus.rejected,
    })
  })

  it('llama a findNotifyRequests con el tournamentId correcto', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    clubModelMock.updatePaymentStatus.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.rejected,
    })
    clubModelMock.updateRegistrationPayment.mockResolvedValue(undefined as never)
    tournamentModelMock.findNotifyRequests.mockResolvedValue([])

    await clubService.rejectPayment(1, 10, 'Comprobante ilegible')

    expect(tournamentModelMock.findNotifyRequests).toHaveBeenCalledWith(300)
  })

  it('envía push notification al jugador rechazado', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    clubModelMock.updatePaymentStatus.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.rejected,
    })
    clubModelMock.updateRegistrationPayment.mockResolvedValue(undefined as never)
    tournamentModelMock.findNotifyRequests.mockResolvedValue([])

    await clubService.rejectPayment(1, 10, 'Comprobante ilegible')

    expect(sendPushNotificationMock).toHaveBeenCalledWith({
      userId: 500,
      type: NotificationType.payment,
      title: 'Pago rechazado',
      message: 'Tu comprobante de pago para Torneo Test ha sido rechazado. Motivo: Comprobante ilegible',
      data: {
        paymentReceiptId: '1',
        tournamentId: '300',
        reason: 'Comprobante ilegible',
      },
    })
  })

  it('envía push notification a todos los usuarios en TournamentNotifyRequest', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    clubModelMock.updatePaymentStatus.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.rejected,
    })
    clubModelMock.updateRegistrationPayment.mockResolvedValue(undefined as never)
    tournamentModelMock.findNotifyRequests.mockResolvedValue([{ userId: 600 }, { userId: 700 }])

    await clubService.rejectPayment(1, 10, 'Comprobante ilegible')

    expect(sendPushNotificationMock).toHaveBeenCalledTimes(3)
    expect(sendPushNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 600,
        type: NotificationType.tournament,
        title: 'Plaza disponible',
        message: 'Se ha liberado una plaza en Torneo Test',
      })
    )
    expect(sendPushNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 700,
        type: NotificationType.tournament,
        title: 'Plaza disponible',
        message: 'Se ha liberado una plaza en Torneo Test',
      })
    )
  })

  it('lanza FORBIDDEN si el usuario no es delegado de ningún club', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(null)

    await expect(clubService.rejectPayment(1, 10, 'Motivo')).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza NOT_FOUND si el comprobante no existe', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(null)

    await expect(clubService.rejectPayment(1, 10, 'Motivo')).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })

  it('lanza FORBIDDEN si el torneo no es del club del delegado', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceiptWrongClub)

    await expect(clubService.rejectPayment(1, 10, 'Motivo')).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza CONFLICT si el comprobante ya fue procesado', async () => {
    clubModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    clubModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceiptAlreadyProcessed)

    await expect(clubService.rejectPayment(1, 10, 'Motivo')).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'CONFLICT' } })
    )
  })
})
