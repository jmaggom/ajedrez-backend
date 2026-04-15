export const userTypeDefs = `
  enum UserRole {
    ADMIN
    DELEGATE
    PLAYER
    REFEREE
  }

  type EloProfile {
    fideClassical: Int!
    fideRapid: Int!
    fideBlitz: Int!
    fadaClassical: Int!
    fadaRapid: Int!
    fadaBlitz: Int!
    onlineClassical: Int!
    onlineRapid: Int!
    onlineBlitz: Int!
    fideClassicalGames: Int!
    fideRapidGames: Int!
    fideBlitzGames: Int!
    fadaClassicalGames: Int!
    fadaRapidGames: Int!
    fadaBlitzGames: Int!
    onlineClassicalGames: Int!
    onlineRapidGames: Int!
    onlineBlitzGames: Int!
  }

  type EloHistoryEntry {
    id: Int!
    source: String!
    period: String!
    classical: Int
    rapid: Int
    blitz: Int
    classicalGames: Int
    rapidGames: Int
    blitzGames: Int
    updatedAt: String!
  }

  type PlayerProfile {
    id: Int!
    fideId: String
    birthDate: String
    federation: String
    elo: EloProfile
    eloHistory: [EloHistoryEntry!]!
  }

  type UserProfile {
    id: Int!
    email: String!
    role: UserRole!
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
    syncFideData: UserProfile!
  }
`;
