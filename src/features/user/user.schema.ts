export const userTypeDefs = `
  type PlayerProfile {
    id: Int!
    fideId: String
    birthDate: String
  }

  type UserProfile {
    id: Int!
    email: String!
    role: String!
    fullName: String!
    phone: String
    player: PlayerProfile
  }

  input UpdateProfileInput {
    fullName: String
    phone: String
    fideId: String
    birthDate: String
  }

  extend type Query {
    me: UserProfile!
  }

  extend type Mutation {
    updateProfile(input: UpdateProfileInput!): UserProfile!
  }
`;
