export const clubTypeDefs = `
  type ClubDelegate {
    id: ID!
    fullName: String!
    email: String!
    phone: String
    playerId: ID
  }

  type ClubPlayerElo {
    fadaClassical: Int!
    fideClassical: Int!
  }

  type PlayerLicense {
    id: ID!
    type: String!
    status: String!
    expiresAt: String!
  }

  type ClubPlayer {
    id: ID!
    fullName: String!
    avatarUrl: String
    fideId: String
    clubId: ID
    elo: ClubPlayerElo
    licenses: [PlayerLicense!]!
    lastActivity: String
  }

  type Club {
    id: ID!
    name: String!
    CIF: String!
    address: String!
    phone: String!
    email: String!
    website: String
    description: String
    logoUrl: String
    shortCode: String!
    createdAt: String!
    delegates: [ClubDelegate!]!
    players: [ClubPlayer!]!
  }

  type PendingPaymentTournament {
    id: ID!
    name: String!
    startDate: String!
  }

  type PendingPaymentRegistration {
    id: ID!
    player: DashboardPlayer!
    tournament: PendingPaymentTournament!
  }

  type PendingPayment {
    id: ID!
    amount: Float!
    date: String!
    fileUrl: String!
    status: String!
    registration: PendingPaymentRegistration!
  }

  type PendingPaymentsConnection {
    nodes: [PendingPayment!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type ExpiringLicense {
    id: ID!
    player: DashboardPlayer!
    type: String!
    expiresAt: String!
  }

  type DashboardPlayer {
    id: ID!
    fullName: String!
  }

  type DashboardTournament {
    id: ID!
    name: String!
    startDate: String!
  }

  type RecentRegistration {
    id: ID!
    player: DashboardPlayer!
    tournament: DashboardTournament!
    status: String!
    registeredAt: String!
  }

  type DelegateDashboard {
    pendingPaymentsCount: Int!
    expiringLicensesCount: Int!
    expiringLicenses: [ExpiringLicense!]!
  }

  input ClubFiltersInput {
    name: String
    community: String
  }

  input UpdateClubInput {
    name: String
    address: String
    phone: String
    email: String
    website: String
    description: String
    logoUrl: String
  }

  type ClubPlayersConnection {
    nodes: [ClubPlayer!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type ClubsConnection {
    nodes: [Club!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type ClubLogoUploadUrl {
    uploadUrl: String!
    token: String!
    path: String!
  }

  type RecentRegistrationsConnection {
    nodes: [RecentRegistration!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  extend type Query {
    clubs(filters: ClubFiltersInput, page: Int, limit: Int): ClubsConnection!
    club(id: ID!): Club
    myClub: Club
    delegateDashboard: DelegateDashboard!
    pendingPayments(tournamentId: ID, page: Int, limit: Int): PendingPaymentsConnection!
    expiringLicenses(daysThreshold: Int): [ExpiringLicense!]!
    clubPlayers(
      clubId: ID!
      search: String
      page: Int
      limit: Int
    ): ClubPlayersConnection!
    searchUserByEmail(email: String!): ClubDelegate
    recentRegistrations(page: Int, limit: Int): RecentRegistrationsConnection!
  }

  extend type Mutation {
    updateClub(input: UpdateClubInput!): Club!
    addPlayerToClub(playerId: ID!): Club!
    removePlayerFromClub(playerId: ID!): Club!
    validatePayment(paymentReceiptId: ID!): PendingPayment!
    rejectPayment(paymentReceiptId: ID!, reason: String!): PendingPayment!
    addDelegate(clubId: ID!, userEmail: String!): Club!
    removeDelegate(clubId: ID!, delegateId: ID!): Club!
    getClubLogoUploadUrl(clubId: ID!, fileName: String!, mimeType: String!): ClubLogoUploadUrl!
    confirmClubLogoUpload(clubId: ID!, path: String!): Club!
  }
`;
