import { PaymentStatus, RegistrationStatus, RegistrationMethod } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset } from 'jest-mock-extended'
import * as clubModel from '../club.model'

jest.mock('../../../config/database', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

import { prisma } from '../../../config/database'
const prismaMock = prisma as ReturnType<typeof mockDeep<PrismaClient>>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockRegistration = {
  id: 100,
  playerId: 200,
  tournamentId: 300,
  status: RegistrationStatus.awaiting_payment,
  paymentStatus: PaymentStatus.pending,
  registeredAt: new Date('2026-05-01T10:00:00Z'),
  method: RegistrationMethod.self,
  registeredById: null,
}

// ── updateRegistrationPayment ─────────────────────────────────────────────────

describe('updateRegistrationPayment', () => {
  beforeEach(() => {
    mockReset(prismaMock)
  })

  it('actualiza status y paymentStatus correctamente cuando se valida el pago', async () => {
    prismaMock.registration.update.mockResolvedValue({
      ...mockRegistration,
      status: RegistrationStatus.confirmed,
      paymentStatus: PaymentStatus.validated,
    })

    await clubModel.updateRegistrationPayment(100, {
      status: RegistrationStatus.confirmed,
      paymentStatus: PaymentStatus.validated,
    })

    expect(prismaMock.registration.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: {
        status: RegistrationStatus.confirmed,
        paymentStatus: PaymentStatus.validated,
      },
    })
  })

  it('actualiza status y paymentStatus correctamente cuando se rechaza el pago', async () => {
    prismaMock.registration.update.mockResolvedValue({
      ...mockRegistration,
      status: RegistrationStatus.cancelled,
      paymentStatus: PaymentStatus.rejected,
    })

    await clubModel.updateRegistrationPayment(100, {
      status: RegistrationStatus.cancelled,
      paymentStatus: PaymentStatus.rejected,
    })

    expect(prismaMock.registration.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: {
        status: RegistrationStatus.cancelled,
        paymentStatus: PaymentStatus.rejected,
      },
    })
  })

  it('actualiza solo status si no se pasa paymentStatus', async () => {
    prismaMock.registration.update.mockResolvedValue({
      ...mockRegistration,
      status: RegistrationStatus.confirmed,
    })

    await clubModel.updateRegistrationPayment(100, {
      status: RegistrationStatus.confirmed,
    })

    expect(prismaMock.registration.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: {
        status: RegistrationStatus.confirmed,
      },
    })
  })

  it('actualiza solo paymentStatus si no se pasa status', async () => {
    prismaMock.registration.update.mockResolvedValue({
      ...mockRegistration,
      paymentStatus: PaymentStatus.validated,
    })

    await clubModel.updateRegistrationPayment(100, {
      paymentStatus: PaymentStatus.validated,
    })

    expect(prismaMock.registration.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: {
        paymentStatus: PaymentStatus.validated,
      },
    })
  })
})
