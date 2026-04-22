import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // ts-jest con Node16/ESM necesita isolatedModules para evitar conflictos
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
      },
      isolatedModules: true,
    }],
  },

  // Rutas de tests
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
  ],

  // Sin alias en tsconfig.paths — no hace falta moduleNameMapper

  // Coverage: services y resolvers, excluye __tests__
  collectCoverageFrom: [
    'src/features/**/*.service.ts',
    'src/features/**/*.resolver.ts',
    'src/common/**/*.service.ts',
    '!src/**/__tests__/**',
  ],

  // Setup global antes de cada test
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

  // Timeout para tests de integración
  testTimeout: 10000,

  verbose: true,
}

export default config
