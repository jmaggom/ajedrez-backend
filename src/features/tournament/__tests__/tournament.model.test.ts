import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset } from 'jest-mock-extended'
import * as tournamentModel from '../tournament.model'

jest.mock('../../../config/database', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

import { prisma } from '../../../config/database'
const prismaMock = prisma as ReturnType<typeof mockDeep<PrismaClient>>

// ── findNotifyRequests ────────────────────────────────────────────────────────

describe('findNotifyRequests', () => {
  beforeEach(() => {
    mockReset(prismaMock)
  })

  it('retorna array de { userId } para el tournamentId dado', async () => {
    prismaMock.tournamentNotifyRequest.findMany.mockResolvedValue([
      { userId: 10 },
      { userId: 20 },
    ] as never)

    const result = await tournamentModel.findNotifyRequests(1)

    expect(prismaMock.tournamentNotifyRequest.findMany).toHaveBeenCalledWith({
      where: { tournamentId: 1 },
      select: { userId: true },
    })
    expect(result).toEqual([{ userId: 10 }, { userId: 20 }])
  })

  it('retorna array vacío si no hay requests', async () => {
    prismaMock.tournamentNotifyRequest.findMany.mockResolvedValue([])

    const result = await tournamentModel.findNotifyRequests(1)

    expect(result).toEqual([])
  })
})

// ── createNotifyRequest ───────────────────────────────────────────────────────

describe('createNotifyRequest', () => {
  beforeEach(() => {
    mockReset(prismaMock)
  })

  it('llama a upsert con los parámetros correctos', async () => {
    prismaMock.tournamentNotifyRequest.upsert.mockResolvedValue({
      userId: 10,
      tournamentId: 1,
    } as never)

    await tournamentModel.createNotifyRequest(10, 1)

    expect(prismaMock.tournamentNotifyRequest.upsert).toHaveBeenCalledWith({
      where: { userId_tournamentId: { userId: 10, tournamentId: 1 } },
      create: { userId: 10, tournamentId: 1 },
      update: {},
      select: { userId: true, tournamentId: true },
    })
  })

  it('retorna { userId, tournamentId }', async () => {
    prismaMock.tournamentNotifyRequest.upsert.mockResolvedValue({
      userId: 10,
      tournamentId: 1,
    } as never)

    const result = await tournamentModel.createNotifyRequest(10, 1)

    expect(result).toEqual({ userId: 10, tournamentId: 1 })
  })
})

// ── deleteNotifyRequest ───────────────────────────────────────────────────────

describe('deleteNotifyRequest', () => {
  beforeEach(() => {
    mockReset(prismaMock)
  })

  it('llama a deleteMany con userId y tournamentId correctos', async () => {
    prismaMock.tournamentNotifyRequest.deleteMany.mockResolvedValue({ count: 1 })

    await tournamentModel.deleteNotifyRequest(10, 1)

    expect(prismaMock.tournamentNotifyRequest.deleteMany).toHaveBeenCalledWith({
      where: { userId: 10, tournamentId: 1 },
    })
  })
})

// ── findNotifyRequest ─────────────────────────────────────────────────────────

describe('findNotifyRequest', () => {
  beforeEach(() => {
    mockReset(prismaMock)
  })

  it('retorna el request si existe', async () => {
    prismaMock.tournamentNotifyRequest.findUnique.mockResolvedValue({
      userId: 10,
      tournamentId: 1,
    } as never)

    const result = await tournamentModel.findNotifyRequest(10, 1)

    expect(prismaMock.tournamentNotifyRequest.findUnique).toHaveBeenCalledWith({
      where: { userId_tournamentId: { userId: 10, tournamentId: 1 } },
      select: { userId: true, tournamentId: true },
    })
    expect(result).toEqual({ userId: 10, tournamentId: 1 })
  })

  it('retorna null si no existe', async () => {
    prismaMock.tournamentNotifyRequest.findUnique.mockResolvedValue(null)

    const result = await tournamentModel.findNotifyRequest(10, 1)

    expect(result).toBeNull()
  })
})
