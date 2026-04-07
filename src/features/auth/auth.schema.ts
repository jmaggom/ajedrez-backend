export const authTypeDefs = `
  input EmailLoginInput {
    email: String!
    otp: String!
  }

  input RegisterPlayerInput {
    name: String!
    email: String!
    password: String!
    birthDate: String!
    NIF: String!
    fideId: String
  }

  input RegisterDelegateInput {
    name: String!
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
    registerPlayer(input: RegisterPlayerInput!): AuthResponse!
    registerDelegate(input: RegisterDelegateInput!): AuthResponse!
    savePushToken(token: String!): Boolean!
  }
`
