export const authTypeDefs = `
  input EmailLoginInput {
    email: String!
    password: String!
  }

  input RegisterPlayerInput {
    name: String!
    email: String!
    password: String!
    birthDate: String!
    NIF: String!
    licenseNumber: String
  }

  input RegisterDelegateInput {
    name: String!
    email: String!
    password: String!
  }

  type AuthResponse {
    token: String!
  }

  type Query {
    _health: String
  }

  type Mutation {
    emailLogin(input: EmailLoginInput!): AuthResponse!
    registerPlayer(input: RegisterPlayerInput!): AuthResponse!
    registerDelegate(input: RegisterDelegateInput!): AuthResponse!
  }
`
