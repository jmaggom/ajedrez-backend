import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset } from 'jest-mock-extended'
import { prisma } from '../../config/database'

// Mock profundo del cliente Prisma — reemplaza la instancia real en tests
jest.mock('../../config/database', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

// Resetear entre tests para evitar que un test afecte al siguiente
beforeEach(() => {
  mockReset(prismaMock)
})

export const prismaMock = prisma as unknown as ReturnType<typeof mockDeep<PrismaClient>>
