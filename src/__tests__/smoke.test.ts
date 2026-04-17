describe('Setup', () => {
  it('Jest está configurado correctamente', () => {
    expect(true).toBe(true)
  })

  it('Las variables de entorno de test existen', () => {
    expect(process.env.JWT_SECRET).toBeDefined()
  })
})
