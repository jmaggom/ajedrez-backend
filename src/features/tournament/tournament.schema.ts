export const tournamentTypeDefs = `
  enum TournamentMode {
    CLASSICAL
    RAPID
    BLITZ
  }

  enum TournamentStatus {
    DRAFT
    OPEN
    IN_PROGRESS
    FINISHED
  }

  enum RegistrationStatus {
    CONFIRMED
    PENDING
    CANCELLED
    AWAITING_PAYMENT
  }

  enum PaymentStatus {
    PENDING
    VALIDATED
    REJECTED
  }

  enum RegistrationMethod {
    SELF
    DELEGATE
  }

  type EloFilter {
    minFideClassical: Int
    maxFideClassical: Int
    minFideRapid: Int
    maxFideRapid: Int
    minFideBlitz: Int
    maxFideBlitz: Int
    minFadaClassical: Int
    maxFadaClassical: Int
    minFadaRapid: Int
    maxFadaRapid: Int
    minFadaBlitz: Int
    maxFadaBlitz: Int
  }

  type TournamentRequirements {
    requireFideId: Boolean!
    requireFadaId: Boolean!
    eloFilter: EloFilter
  }

  type Tournament {
    id: ID!
    name: String!
    venue: String!
    latitude: Float
    longitude: Float
    notificationRadius: Int
    geoNotificationActive: Boolean!
    startDate: String!
    endDate: String!
    format: String!
    rounds: Int!
    currentRound: Int!
    timeControl: String!
    mode: TournamentMode!
    availableSlots: Int!
    registrationFee: Float!
    status: TournamentStatus!
    description: String
    eloEligible: Boolean!
    requirements: TournamentRequirements!
    organizer: Club!
    registrations: [Registration!]!
    standings: TournamentStandings!
  }

  type Registration {
    id: ID!
    tournament: Tournament!
    player: PlayerProfile!
    status: RegistrationStatus!
    paymentStatus: PaymentStatus!
    method: RegistrationMethod!
    registeredAt: String!
  }

  type TournamentConnection {
    nodes: [Tournament!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type RegistrationResult {
    registration: Registration!
  }

  type DeleteTournamentResult {
    success: Boolean!
    hadConfirmedRegistrations: Boolean!
  }

  input EloFilterInput {
    minFideClassical: Int
    maxFideClassical: Int
    minFideRapid: Int
    maxFideRapid: Int
    minFideBlitz: Int
    maxFideBlitz: Int
    minFadaClassical: Int
    maxFadaClassical: Int
    minFadaRapid: Int
    maxFadaRapid: Int
    minFadaBlitz: Int
    maxFadaBlitz: Int
  }

  input TournamentRequirementsInput {
    requireFideId: Boolean!
    requireFadaId: Boolean!
    eloFilter: EloFilterInput
  }

  input CreateTournamentInput {
    name: String!
    venue: String!
    latitude: Float
    longitude: Float
    notificationRadius: Int
    geoNotificationActive: Boolean
    startDate: String!
    endDate: String!
    format: String!
    rounds: Int!
    timeControl: String!
    mode: TournamentMode!
    availableSlots: Int!
    registrationFee: Float!
    description: String
    eloEligible: Boolean!
    requirements: TournamentRequirementsInput!
    publishNow: Boolean
  }

  input UpdateTournamentInput {
    name: String
    venue: String
    latitude: Float
    longitude: Float
    notificationRadius: Int
    geoNotificationActive: Boolean
    startDate: String
    endDate: String
    format: String
    rounds: Int
    timeControl: String
    mode: TournamentMode
    availableSlots: Int
    registrationFee: Float
    description: String
    eloEligible: Boolean
    requirements: TournamentRequirementsInput
  }

  input TournamentFiltersInput {
    status: TournamentStatus
    statuses: [TournamentStatus!]
    mode: TournamentMode
    name: String
    dateFrom: String
    dateTo: String
    clubId: ID
  }

  extend type Query {
    tournaments(filters: TournamentFiltersInput, page: Int, limit: Int): TournamentConnection!
    tournament(id: ID!): Tournament
    nearbyTournaments(lat: Float!, lng: Float!, radiusKm: Int!): [Tournament!]!
  }

  type NotifyRequestStatus {
    isRequested: Boolean!
  }

  extend type Query {
    myNotifyRequest(tournamentId: ID!): NotifyRequestStatus!
  }

  extend type Mutation {
    createTournament(input: CreateTournamentInput!): Tournament!
    updateTournament(id: ID!, input: UpdateTournamentInput!): Tournament!
    deleteTournament(id: ID!): DeleteTournamentResult!
    registerTournament(tournamentId: ID!): RegistrationResult!
    cancelRegistration(registrationId: ID!): Boolean!
    requestTournamentNotification(tournamentId: ID!): NotifyRequestStatus!
    cancelTournamentNotification(tournamentId: ID!): NotifyRequestStatus!
  }
`;
