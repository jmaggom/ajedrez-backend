import { PaymentStatus, RegistrationStatus, Role, TournamentStatus } from '@prisma/client'
import * as paymentService from '../payment.service'
import * as paymentModel from '../payment.model'
import * as storageService from '../../../common/storage/storage.service'
import { ALLOWED_RECEIPT_TYPES } from '../../../common/storage/storage.constant'
import type { PaymentReceiptWithRelations, RegistrationWithOwner } from '../payment.types'

jest.mock('../payment.model')
jest.mock('../../../common/storage/storage.service')

const paymentModelMock = paymentModel as jest.Mocked<typeof paymentModel>
const storageServiceMock = storageService as jest.Mocked<typeof storageService>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockRegistrationWithOwner: RegistrationWithOwner = {
  id: 100,
  playerId: 200,
  tournamentId: 300,
  status: RegistrationStatus.awaiting_payment,
  paymentReceipt: null,
  player: {
    userId: 500,
  },
}

const mockRegistrationWithReceipt: RegistrationWithOwner = {
  ...mockRegistrationWithOwner,
  paymentReceipt: {
    id: 1,
    registrationId: 100,
    licenseId: null,
    amount: 1000,
    date: new Date('2026-05-01'),
    status: PaymentStatus.pending,
    fileUrl: 'receipt/500/100/1714550400000-receipt.jpg',
    validatedById: null,
    validatedAt: null,
  },
}

const mockRegistrationNotOwned: RegistrationWithOwner = {
  ...mockRegistrationWithOwner,
  player: {
    userId: 999,
  },
}

const mockPaymentReceipt: PaymentReceiptWithRelations = {
  id: 1,
  registrationId: 100,
  licenseId: null,
  amount: 1000,
  date: new Date('2026-05-01'),
  status: PaymentStatus.pending,
  fileUrl: 'receipt/500/100/1714550400000-receipt.jpg',
  validatedById: null,
  validatedAt: null,
  registration: {
    id: 100,
    playerId: 200,
    tournamentId: 300,
    status: RegistrationStatus.awaiting_payment,
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

const mockPaymentReceiptsList: PaymentReceiptWithRelations[] = [
  mockPaymentReceipt,
  {
    ...mockPaymentReceipt,
    id: 2,
    registrationId: 101,
    status: PaymentStatus.validated,
    validatedAt: new Date('2026-05-02'),
  },
]

// ── getReceiptUploadUrl ──────────────────────────────────────────────────────

describe('getReceiptUploadUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('devuelve uploadUrl y path correctos', async () => {
    paymentModelMock.findRegistrationById.mockResolvedValue(mockRegistrationWithOwner)
    storageServiceMock.buildReceiptPath.mockReturnValue('receipt/500/100/1714550400000-receipt.jpg')
    storageServiceMock.getReceiptUploadUrl.mockResolvedValue({
      uploadUrl: 'https://supabase.example.com/upload-url',
      token: 'upload-token-123',
      path: 'receipt/500/100/1714550400000-receipt.jpg',
    })

    const result = await paymentService.getReceiptUploadUrl(
      {
        registrationId: '100',
        fileName: 'receipt.jpg',
        mimeType: 'image/jpeg',
        amount: 1000,
      },
      500
    )

    expect(result.uploadUrl).toBe('https://supabase.example.com/upload-url')
    expect(result.token).toBe('upload-token-123')
    expect(result.path).toBe('receipt/500/100/1714550400000-receipt.jpg')
    expect(storageServiceMock.getReceiptUploadUrl).toHaveBeenCalledWith({
      path: 'receipt/500/100/1714550400000-receipt.jpg',
    })
  })

  it('lanza NOT_FOUND si la inscripción no existe', async () => {
    paymentModelMock.findRegistrationById.mockResolvedValue(null)

    await expect(
      paymentService.getReceiptUploadUrl(
        {
          registrationId: '100',
          fileName: 'receipt.jpg',
          mimeType: 'image/jpeg',
          amount: 1000,
        },
        500
      )
    ).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })

  it('lanza FORBIDDEN si la inscripción no pertenece al usuario', async () => {
    paymentModelMock.findRegistrationById.mockResolvedValue(mockRegistrationNotOwned)

    await expect(
      paymentService.getReceiptUploadUrl(
        {
          registrationId: '100',
          fileName: 'receipt.jpg',
          mimeType: 'image/jpeg',
          amount: 1000,
        },
        500
      )
    ).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza CONFLICT si ya existe un comprobante para esa inscripción', async () => {
    paymentModelMock.findRegistrationById.mockResolvedValue(mockRegistrationWithReceipt)

    await expect(
      paymentService.getReceiptUploadUrl(
        {
          registrationId: '100',
          fileName: 'receipt.jpg',
          mimeType: 'image/jpeg',
          amount: 1000,
        },
        500
      )
    ).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'CONFLICT' } })
    )
  })

  it('lanza BAD_USER_INPUT si el mimeType no está permitido', async () => {
    paymentModelMock.findRegistrationById.mockResolvedValue(mockRegistrationWithOwner)

    await expect(
      paymentService.getReceiptUploadUrl(
        {
          registrationId: '100',
          fileName: 'receipt.exe',
          mimeType: 'application/octet-stream',
          amount: 1000,
        },
        500
      )
    ).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'BAD_USER_INPUT' } })
    )
  })
})

// ── confirmReceiptUpload ─────────────────────────────────────────────────────

describe('confirmReceiptUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('crea PaymentReceipt con status pending y path correcto', async () => {
    paymentModelMock.findRegistrationById.mockResolvedValue(mockRegistrationWithOwner)
    storageServiceMock.verifyFileExists.mockResolvedValue(true)
    paymentModelMock.createPaymentReceipt.mockResolvedValue({
      id: 1,
      registrationId: 100,
      licenseId: null,
      amount: 1000,
      fileUrl: 'receipt/500/100/1714550400000-receipt.jpg',
      date: new Date(),
      status: PaymentStatus.pending,
      validatedById: null,
      validatedAt: null,
    })
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)

    const result = await paymentService.confirmReceiptUpload(
      {
        registrationId: '100',
        path: 'receipt/500/100/1714550400000-receipt.jpg',
        amount: 1000,
      },
      500
    )

    expect(paymentModelMock.createPaymentReceipt).toHaveBeenCalledWith({
      registrationId: 100,
      amount: 1000,
      fileUrl: 'receipt/500/100/1714550400000-receipt.jpg',
    })
    expect(result.status).toBe(PaymentStatus.pending)
    expect(result.fileUrl).toBe('receipt/500/100/1714550400000-receipt.jpg')
  })

  it('actualiza Registration.status a pending si estaba en awaiting_payment', async () => {
    paymentModelMock.findRegistrationById.mockResolvedValue(mockRegistrationWithOwner)
    storageServiceMock.verifyFileExists.mockResolvedValue(true)
    paymentModelMock.createPaymentReceipt.mockResolvedValue({
      id: 1,
      registrationId: 100,
      licenseId: null,
      amount: 1000,
      fileUrl: 'receipt/500/100/1714550400000-receipt.jpg',
      date: new Date(),
      status: PaymentStatus.pending,
      validatedById: null,
      validatedAt: null,
    })
    paymentModelMock.findPaymentReceiptById.mockResolvedValue(mockPaymentReceipt)

    await paymentService.confirmReceiptUpload(
      {
        registrationId: '100',
        path: 'receipt/500/100/1714550400000-receipt.jpg',
        amount: 1000,
      },
      500
    )

    expect(paymentModelMock.updateRegistrationStatus).toHaveBeenCalledWith(100, RegistrationStatus.pending)
  })

  it('lanza NOT_FOUND si la inscripción no existe', async () => {
    paymentModelMock.findRegistrationById.mockResolvedValue(null)

    await expect(
      paymentService.confirmReceiptUpload(
        {
          registrationId: '100',
          path: 'receipt/500/100/1714550400000-receipt.jpg',
          amount: 1000,
        },
        500
      )
    ).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'NOT_FOUND' } })
    )
  })

  it('lanza FORBIDDEN si la inscripción no pertenece al usuario', async () => {
    paymentModelMock.findRegistrationById.mockResolvedValue(mockRegistrationNotOwned)

    await expect(
      paymentService.confirmReceiptUpload(
        {
          registrationId: '100',
          path: 'receipt/500/100/1714550400000-receipt.jpg',
          amount: 1000,
        },
        500
      )
    ).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'FORBIDDEN' } })
    )
  })

  it('lanza BAD_USER_INPUT si el archivo no existe en storage', async () => {
    paymentModelMock.findRegistrationById.mockResolvedValue(mockRegistrationWithOwner)
    storageServiceMock.verifyFileExists.mockResolvedValue(false)

    await expect(
      paymentService.confirmReceiptUpload(
        {
          registrationId: '100',
          path: 'receipt/500/100/1714550400000-receipt.jpg',
          amount: 1000,
        },
        500
      )
    ).rejects.toThrow(
      expect.objectContaining({ extensions: { code: 'BAD_USER_INPUT' } })
    )
  })
})

// ── getMyPayments ────────────────────────────────────────────────────────────

describe('getMyPayments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('devuelve solo los comprobantes del usuario autenticado', async () => {
    paymentModelMock.findPaymentsByPlayer.mockResolvedValue(mockPaymentReceiptsList)

    const result = await paymentService.getMyPayments(500)

    expect(paymentModelMock.findPaymentsByPlayer).toHaveBeenCalledWith(500)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[0].status).toBe('PENDING')
    expect(result[1].id).toBe('2')
    expect(result[1].status).toBe('VALIDATED')
  })

  it('devuelve array vacío si no tiene comprobantes', async () => {
    paymentModelMock.findPaymentsByPlayer.mockResolvedValue([])

    const result = await paymentService.getMyPayments(500)

    expect(result).toEqual([])
  })
})
