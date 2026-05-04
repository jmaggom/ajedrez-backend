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

  type TournamentHistorySummary {
    id: ID!
    name: String!
    startDate: String!
    registrationStatus: String!
  }

  type PlayerProfile {
    id: Int!
    name: String
    fideId: String
    birthDate: String
    federation: String
    clubId: ID
    elo: EloProfile
    eloHistory: [EloHistoryEntry!]!
    licenses: [PlayerLicense!]!
  }

  type DelegateProfile {
    id: Int!
    clubId: ID!
  }

  type UserProfile {
    id: Int!
    email: String!
    role: UserRole!
    fullName: String!
    phone: String
    avatarUrl: String
    player: PlayerProfile
    delegate: DelegateProfile
  }

  type AvatarUploadUrl {
    uploadUrl: String!
    token: String!
    path: String!
  }

  input GetAvatarUploadUrlInput {
    fileName: String!
    mimeType: String!
  }

  input UpdateProfileInput {
    fullName: String
    phone: String
    fideId: String
    birthDate: String
  }

  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
  }

  extend type Query {
    me: UserProfile!
    myTournamentHistory: [TournamentHistorySummary!]!
  }

  extend type Mutation {
    updateProfile(input: UpdateProfileInput!): UserProfile!
    syncFideData: UserProfile!
    getAvatarUploadUrl(input: GetAvatarUploadUrlInput!): AvatarUploadUrl!
    confirmAvatarUpload(path: String!): UserProfile!
    changePassword(input: ChangePasswordInput!): Boolean!
  }
`;
