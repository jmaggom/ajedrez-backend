import { Role } from '@prisma/client'
import { GraphQLError } from 'graphql'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import * as authService from '../../auth.service'
import * as authModel from '../../auth.model'
import { JWT_SECRET } from '../../constants'
import type { EmailLoginInput, RegisterPlayerInput } from '../../auth.types'

jest.mock('../../auth.model')
jest.mock('bcryptjs')
jest.mock('jsonwebtoken')

const authModelMock = authModel as jest.Mocked<typeof authModel>
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>
const jwtMock = jwt as jest.Mocked<typeof jwt>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 1,
  email: 'player@test.com',
  password: '$2a$10$hashedpassword',
  fullName: 'Jugador Test',
  role: Role.player,
  phone: null,
  pushToken: null,
  avatarUrl: null,
  createdAt: new Date('2025-01-01'),
}

const mockEmailLoginInput: EmailLoginInput = {
  email: 'player@test.com',
  otp: 'password123',
}

const mockRegisterPlayerInput: RegisterPlayerInput = {
  email: 'newplayer@test.com',
  password: 'password123',
  name: 'Nuevo Jugador',
  birthDate: '2000-01-01',
  NIF: '12345678A',
  fideId: 'ESP123456',
}

const mockToken = 'mock.jwt.token'

// ── emailLogin ────────────────────────────────────────────────────────────────

describe('login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lanza NOT_FOUND si el email no existe', async () => {
    // Arrange
    authModelMock.findUserByEmail.mockResolvedValue(null)

    // Act & Assert
    await expect(authService.login(mockEmailLoginInput)).rejects.toThrow(
      expect.objectContaining({
        message: 'User not found',
        extensions: { code: 'NOT_FOUND' },
      })
    )
    expect(authModelMock.findUserByEmail).toHaveBeenCalledWith('player@test.com')
  })

  it('lanza UNAUTHENTICATED si la contraseña no coincide', async () => {
    // Arrange
    authModelMock.findUserByEmail.mockResolvedValue(mockUser)
    bcryptMock.compare.mockResolvedValue(false as never)

    // Act & Assert
    await expect(authService.login(mockEmailLoginInput)).rejects.toThrow(
      expect.objectContaining({
        message: 'Invalid credentials',
        extensions: { code: 'UNAUTHENTICATED' },
      })
    )
    expect(bcryptMock.compare).toHaveBeenCalledWith('password123', '$2a$10$hashedpassword')
  })

  it('devuelve JWT válido si las credenciales son correctas', async () => {
    // Arrange
    authModelMock.findUserByEmail.mockResolvedValue(mockUser)
    bcryptMock.compare.mockResolvedValue(true as never)
    jwtMock.sign.mockReturnValue(mockToken as never)
    authModelMock.upsertMobileSession.mockResolvedValue(undefined)

    // Act
    const result = await authService.login(mockEmailLoginInput)

    // Assert
    expect(result).toEqual({ mToken: mockToken })
    expect(jwtMock.sign).toHaveBeenCalledWith(
      { id: 1, email: 'player@test.com', role: Role.player, fullName: 'Jugador Test' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    expect(authModelMock.upsertMobileSession).toHaveBeenCalledWith(
      1,
      mockToken,
      expect.any(Date)
    )
  })

  it('el JWT contiene id, email, role y fullName', async () => {
    // Arrange
    authModelMock.findUserByEmail.mockResolvedValue(mockUser)
    bcryptMock.compare.mockResolvedValue(true as never)
    jwtMock.sign.mockReturnValue(mockToken as never)
    authModelMock.upsertMobileSession.mockResolvedValue(undefined)

    // Act
    await authService.login(mockEmailLoginInput)

    // Assert
    const signCall = jwtMock.sign.mock.calls[0]
    const payload = signCall[0] as { id: number; email: string; role: string; fullName: string }
    expect(payload).toEqual({
      id: 1,
      email: 'player@test.com',
      role: Role.player,
      fullName: 'Jugador Test',
    })
  })
})

// ── registerPlayer ────────────────────────────────────────────────────────────

describe('registerPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lanza BAD_USER_INPUT si el email ya está registrado', async () => {
    // Arrange
    authModelMock.findUserByEmail.mockResolvedValue(mockUser)

    // Act & Assert
    await expect(authService.registerPlayer(mockRegisterPlayerInput)).rejects.toThrow(
      expect.objectContaining({
        message: 'Email already in use',
        extensions: { code: 'BAD_USER_INPUT' },
      })
    )
    expect(authModelMock.findUserByEmail).toHaveBeenCalledWith('newplayer@test.com')
  })

  it('hashea la contraseña antes de guardar (nunca guarda plaintext)', async () => {
    // Arrange
    authModelMock.findUserByEmail.mockResolvedValue(null)
    bcryptMock.hash.mockResolvedValue('$2a$10$hashedNewPassword' as never)
    authModelMock.createUserWithPlayer.mockResolvedValue(mockUser)
    jwtMock.sign.mockReturnValue(mockToken as never)
    authModelMock.upsertMobileSession.mockResolvedValue(undefined)

    // Act
    await authService.registerPlayer(mockRegisterPlayerInput)

    // Assert
    expect(bcryptMock.hash).toHaveBeenCalledWith('password123', 10)
    expect(authModelMock.createUserWithPlayer).toHaveBeenCalledWith({
      email: 'newplayer@test.com',
      hashedPassword: '$2a$10$hashedNewPassword',
      fullName: 'Nuevo Jugador',
      birthDate: new Date('2000-01-01'),
      NIF: '12345678A',
      fideId: 'ESP123456',
    })
  })

  it('crea User + Player + Elo en una sola transacción', async () => {
    // Arrange
    authModelMock.findUserByEmail.mockResolvedValue(null)
    bcryptMock.hash.mockResolvedValue('$2a$10$hashedNewPassword' as never)
    authModelMock.createUserWithPlayer.mockResolvedValue(mockUser)
    jwtMock.sign.mockReturnValue(mockToken as never)
    authModelMock.upsertMobileSession.mockResolvedValue(undefined)

    // Act
    await authService.registerPlayer(mockRegisterPlayerInput)

    // Assert
    // createUserWithPlayer es la función del model que ejecuta la transacción
    expect(authModelMock.createUserWithPlayer).toHaveBeenCalledTimes(1)
    expect(authModelMock.createUserWithPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newplayer@test.com',
        hashedPassword: '$2a$10$hashedNewPassword',
      })
    )
  })

  it('devuelve JWT válido tras registro', async () => {
    // Arrange
    authModelMock.findUserByEmail.mockResolvedValue(null)
    bcryptMock.hash.mockResolvedValue('$2a$10$hashedNewPassword' as never)
    authModelMock.createUserWithPlayer.mockResolvedValue(mockUser)
    jwtMock.sign.mockReturnValue(mockToken as never)
    authModelMock.upsertMobileSession.mockResolvedValue(undefined)

    // Act
    const result = await authService.registerPlayer(mockRegisterPlayerInput)

    // Assert
    expect(result).toEqual({ mToken: mockToken })
    expect(jwtMock.sign).toHaveBeenCalledWith(
      { id: 1, email: 'player@test.com', role: Role.player, fullName: 'Jugador Test' },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    expect(authModelMock.upsertMobileSession).toHaveBeenCalledWith(
      1,
      mockToken,
      expect.any(Date)
    )
  })
})

// ── logout ────────────────────────────────────────────────────────────────────

describe('logout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('llama a invalidateUserSessions con el userId correcto', async () => {
    // Arrange
    authModelMock.invalidateUserSessions.mockResolvedValue(undefined)

    // Act
    await authService.logout(1)

    // Assert
    expect(authModelMock.invalidateUserSessions).toHaveBeenCalledWith(1)
  })

  it('retorna true', async () => {
    // Arrange
    authModelMock.invalidateUserSessions.mockResolvedValue(undefined)

    // Act
    const result = await authService.logout(1)

    // Assert
    expect(result).toBe(true)
  })
})
