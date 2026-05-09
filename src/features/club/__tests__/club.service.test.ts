import { PaymentStatus, RegistrationStatus, NotificationType, Role, TournamentStatus } from '@prisma/client'
import * as paymentService from '../../payment/payment.service'
import * as paymentModel from '../../payment/payment.model'
import * as tournamentModel from '../../tournament/tournament.model'
import * as clubService from '../club.service'
import * as clubModel from '../club.model'
import { sendPushNotification } from '../../../common/notification/notification.service'
import type { PaymentReceiptWithRelations } from '../../payment/payment.types'
import type { ClubWithRelations } from '../club.types'

// Mock de prisma.$transaction — inline en jest.mock para evitar hoisting issues
const mockTxPaymentReceipt = { update: jest.fn() }
const mockTxRegistration = { update: jest.fn() }
const mockTx = {
  paymentReceipt: mockTxPaymentReceipt,
  registration: mockTxRegistration,
}

jest.mock('../../payment/payment.model')
jest.mock('../../tournament/tournament.model')
jest.mock('../club.model')
jest.mock('../../../config/database', () => ({
  prisma: {
    $transaction: jest.fn(async (callback: (tx: typeof mockTx) => Promise<unknown>) => {
      return callback(mockTx)
    }),
  },
}))
jest.mock('../../../common/notification/notification.service', () => ({
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
}))

const paymentModelMock = paymentModel as jest.Mocked<typeof paymentModel>
const tournamentModelMock = tournamentModel as jest.Mocked<typeof tournamentModel>
const clubModelMock = clubModel as jest.Mocked<typeof clubModel>
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
    playerId: 200,
    tournamentId: 300,
    status: RegistrationStatus.pending,
    paymentStatus: PaymentStatus.pending,
    registeredAt: new Date('2026-05-01'),
    method: 'self' as const,
    registeredById: null,
    player: {
      id: 200,
      userId: 500,
      birthDate: new Date('2000-01-01'),
      NIF: '12345678A',
      fideId: null,
      federation: null,
      joinedAt: new Date('2025-01-01'),
      leftAt: null,
      lastLatitude: null,
      lastLongitude: null,
      lastLocationAt: null,
      clubId: null,
      eloId: 1,
      user: {
        id: 500,
        fullName: 'Jugador Test',
      },
    },
    tournament: {
      id: 300,
      name: 'Torneo Test',
      organizerId: 1,
      startDate: new Date('2026-06-01'),
    },
  },
  validatedBy: null,
}

const mockPaymentReceiptAlreadyProcessed: PaymentReceiptWithRelations = {
  ...mockPaymentReceipt,
  status: PaymentStatus.validated,
}

const mockPaymentReceiptWrongClub: PaymentReceiptWithRelations = {
  ...mockPaymentReceipt,
  registration: {
    id: 100,
    playerId: 200,
    tournamentId: 300,
    status: RegistrationStatus.pending,
    paymentStatus: PaymentStatus.pending,
    registeredAt: new Date('2026-05-01'),
    method: 'self' as const,
    registeredById: null,
    player: {
      id: 200,
      userId: 500,
      birthDate: new Date('2000-01-01'),
      NIF: '12345678A',
      fideId: null,
      federation: null,
      joinedAt: new Date('2025-01-01'),
      leftAt: null,
      lastLatitude: null,
      lastLongitude: null,
      lastLocationAt: null,
      clubId: null,
      eloId: 1,
      user: {
        id: 500,
        fullName: 'Jugador Test',
      },
    },
    tournament: {
      id: 300,
      name: 'Torneo Test',
      organizerId: 999,
      startDate: new Date('2026-06-01'),
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
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    paymentModelMock.validatePaymentTransaction.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.validated,
    })

    await paymentService.validatePayment(1, 10)

    expect(paymentModelMock.validatePaymentTransaction).toHaveBeenCalledWith(1, 10)
  })

  it('envía push notification al jugador', async () => {
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    paymentModelMock.validatePaymentTransaction.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.validated,
    })

    await paymentService.validatePayment(1, 10)

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
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(null)

    await expect(paymentService.validatePayment(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza NOT_FOUND si el comprobante no existe', async () => {
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(null)

    await expect(paymentService.validatePayment(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })

  it('lanza FORBIDDEN si el torneo no es del club del delegado', async () => {
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceiptWrongClub)

    await expect(paymentService.validatePayment(1, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza CONFLICT si el comprobante ya fue procesado', async () => {
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceiptAlreadyProcessed)

    await expect(paymentService.validatePayment(1, 10)).rejects.toThrow(
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
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    paymentModelMock.rejectPaymentTransaction.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.rejected,
    })
    tournamentModelMock.findNotifyRequests.mockResolvedValue([])

    await paymentService.rejectPayment(1, 10, 'Comprobante ilegible')

    expect(paymentModelMock.rejectPaymentTransaction).toHaveBeenCalledWith(1, 10)
  })

  it('llama a findNotifyRequests con el tournamentId correcto', async () => {
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    paymentModelMock.rejectPaymentTransaction.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.rejected,
    })
    tournamentModelMock.findNotifyRequests.mockResolvedValue([])

    await paymentService.rejectPayment(1, 10, 'Comprobante ilegible')

    expect(tournamentModelMock.findNotifyRequests).toHaveBeenCalledWith(300)
  })

  it('envía push notification al jugador rechazado', async () => {
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    paymentModelMock.rejectPaymentTransaction.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.rejected,
    })
    tournamentModelMock.findNotifyRequests.mockResolvedValue([])

    await paymentService.rejectPayment(1, 10, 'Comprobante ilegible')

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
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)
    paymentModelMock.rejectPaymentTransaction.mockResolvedValue({
      ...mockPaymentReceipt,
      status: PaymentStatus.rejected,
    })
    tournamentModelMock.findNotifyRequests.mockResolvedValue([{ userId: 600 }, { userId: 700 }])

    await paymentService.rejectPayment(1, 10, 'Comprobante ilegible')

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
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(null)

    await expect(paymentService.rejectPayment(1, 10, 'Motivo')).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza NOT_FOUND si el comprobante no existe', async () => {
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(null)

    await expect(paymentService.rejectPayment(1, 10, 'Motivo')).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })

  it('lanza FORBIDDEN si el torneo no es del club del delegado', async () => {
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceiptWrongClub)

    await expect(paymentService.rejectPayment(1, 10, 'Motivo')).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza CONFLICT si el comprobante ya fue procesado', async () => {
    paymentModelMock.findClubByDelegateUserId.mockResolvedValue(mockClub)
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceiptAlreadyProcessed)

    await expect(paymentService.rejectPayment(1, 10, 'Motivo')).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'CONFLICT' } })
    )
  })
})

// ── addDelegate ──────────────────────────────────────────────────────────────

describe('addDelegate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('añade correctamente un delegate al club', async () => {
    const mockUser = {
      id: 999,
      email: 'newdelegate@test.com',
      fullName: 'New Delegate',
      role: 'player',
      player: null,
    }

    clubModelMock.findClubById.mockResolvedValue(mockClub)
    clubModelMock.findUserByEmail.mockResolvedValue(mockUser)
    clubModelMock.addDelegateToClub.mockResolvedValue({
      ...mockClub,
      delegates: [
        ...mockClub.delegates,
        {
          id: 2,
          userId: 999,
          user: {
            email: 'newdelegate@test.com',
            fullName: 'New Delegate',
            phone: null,
            player: null,
          },
        },
      ],
    })

    const result = await clubService.addDelegate(1, 'newdelegate@test.com', 10)

    expect(clubModelMock.addDelegateToClub).toHaveBeenCalledWith(1, 999)
    expect(result.delegates).toHaveLength(2)
  })

  it('lanza NOT_FOUND si el club no existe', async () => {
    clubModelMock.findClubById.mockResolvedValue(null)

    await expect(clubService.addDelegate(1, 'user@test.com', 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })

  it('lanza FORBIDDEN si el solicitante no es delegado del club', async () => {
    clubModelMock.findClubById.mockResolvedValue(mockClub)

    await expect(clubService.addDelegate(1, 'user@test.com', 888)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza NOT_FOUND si el email no corresponde a ningún usuario', async () => {
    clubModelMock.findClubById.mockResolvedValue(mockClub)
    clubModelMock.findUserByEmail.mockResolvedValue(null)

    await expect(clubService.addDelegate(1, 'noexiste@test.com', 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })

  it('lanza CONFLICT si el usuario ya es delegado', async () => {
    const existingDelegate = {
      id: 10,
      email: 'delegate@test.com',
      fullName: 'Delegado Test',
      role: 'delegate',
      player: null,
    }

    clubModelMock.findClubById.mockResolvedValue(mockClub)
    clubModelMock.findUserByEmail.mockResolvedValue(existingDelegate)

    await expect(clubService.addDelegate(1, 'delegate@test.com', 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'CONFLICT' } })
    )
  })
})

// ── removeDelegate ───────────────────────────────────────────────────────────

describe('removeDelegate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('elimina correctamente un delegate del club', async () => {
    const clubWithTwoDelegates = {
      ...mockClub,
      delegates: [
        { id: 1, userId: 10, user: { email: 'delegate1@test.com', fullName: 'Delegado 1', phone: null, player: null } },
        { id: 2, userId: 20, user: { email: 'delegate2@test.com', fullName: 'Delegado 2', phone: null, player: null } },
      ],
    }

    clubModelMock.findClubById.mockResolvedValue(clubWithTwoDelegates)
    clubModelMock.removeDelegateFromClub.mockResolvedValue({
      ...clubWithTwoDelegates,
      delegates: [
        {
          id: 1,
          userId: 10,
          user: {
            email: 'delegate1@test.com',
            fullName: 'Delegado 1',
            phone: null,
            player: null,
          },
        },
      ],
    })

    const result = await clubService.removeDelegate(1, 20, 10)

    expect(clubModelMock.removeDelegateFromClub).toHaveBeenCalledWith(1, 20)
    expect(result.delegates).toHaveLength(1)
  })

  it('lanza NOT_FOUND si el club no existe', async () => {
    clubModelMock.findClubById.mockResolvedValue(null)

    await expect(clubService.removeDelegate(1, 20, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })

  it('lanza FORBIDDEN si el solicitante no es delegado', async () => {
    clubModelMock.findClubById.mockResolvedValue(mockClub)

    await expect(clubService.removeDelegate(1, 20, 888)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza BAD_USER_INPUT si intenta eliminarse a sí mismo', async () => {
    clubModelMock.findClubById.mockResolvedValue(mockClub)

    await expect(clubService.removeDelegate(1, 10, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'BAD_USER_INPUT' } })
    )
  })

  it('lanza NOT_FOUND si el usuario target no es delegado', async () => {
    clubModelMock.findClubById.mockResolvedValue(mockClub)

    await expect(clubService.removeDelegate(1, 999, 10)).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })
})
