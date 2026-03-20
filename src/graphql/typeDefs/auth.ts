export const authTypeDefs = `
  input EmailLoginInput { 
    email: String!
    password: String!
  }

  input RegisterJugadorInput {
  nombre: String!
  email: String!
  password: String!
  fechaNacimiento: String!
  NIF: String!
  numLicencia: String
}

input RegisterDelegadoInput {
  nombre: String!
  email: String!
  password: String!
}

type AuthResponse { 
    mToken: String!
}

type Query {
  _health: String
}

type Mutation {
  emailLogin(input: EmailLoginInput!): AuthResponse!
  registerJugador(input: RegisterJugadorInput!): AuthResponse!
  registerDelegado(input: RegisterDelegadoInput!): AuthResponse!
}
`