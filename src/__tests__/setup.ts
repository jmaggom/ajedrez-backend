// Variables de entorno para tests
process.env.JWT_SECRET = 'test-secret-32-characters-minimum'
process.env.DATABASE_URL = 'postgresql://test'

// Limpia todos los mocks entre tests para evitar contaminación entre casos
beforeEach(() => {
  jest.clearAllMocks()
})
