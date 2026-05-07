export const gameTypeDefs = `
  enum GameResult {
    WHITE_WINS
    BLACK_WINS
    DRAW
    BYE
  }

  enum GameResultInput {
    WHITE_WINS
    BLACK_WINS
    DRAW
  }

  enum RoundStatus {
    PENDING_PAIRINGS
    PAIRINGS_PUBLISHED
    RESULTS_COMPLETE
  }

  type GamePlayerElo {
    fideClassical: Int!
    fadaClassical: Int!
  }

  type GamePlayer {
    id: ID!
    fullName: String
    fideId: String
    elo: GamePlayerElo
  }

  type GameRegisteredBy {
    id: ID!
    fullName: String!
    role: String!
  }

  type Game {
    id: ID!
    tournamentId: ID!
    roundNumber: Int!
    tableNumber: Int
    isBye: Boolean!
    whitePlayer: GamePlayer
    blackPlayer: GamePlayer
    byePlayer: GamePlayer
    result: GameResult
    eloEligible: Boolean!
    registeredBy: GameRegisteredBy
  }

  type StandingEntry {
    position: Int!
    player: GamePlayer!
    points: Float!
    gamesPlayed: Int!
    wins: Int!
    draws: Int!
    losses: Int!
    performanceRating: Int
  }

  type TournamentStandings {
    tournamentId: ID!
    tournamentName: String!
    status: String!
    lastUpdated: String
    entries: [StandingEntry!]!
  }

  type SubmitGameResultPayload {
    game: Game!
    standings: TournamentStandings!
  }

  type RoundPairing {
    gameId: ID!
    roundNumber: Int!
    tableNumber: Int!
    isBye: Boolean!
    result: String
    whitePlayer: GamePlayer
    blackPlayer: GamePlayer
    byePlayer: GamePlayer
  }

  type RoundSummary {
    roundNumber: Int!
    status: RoundStatus!
    pairings: [RoundPairing!]!
  }

  type PublishPairingsPayload {
    roundNumber: Int!
    pairings: [RoundPairing!]!
  }

  type CloseTournamentPayload {
    tournament: Tournament!
    finalStandings: TournamentStandings!
  }

  input CreateGameInput {
    tournamentId: ID!
    roundNumber: Int!
    whitePlayerId: ID!
    blackPlayerId: ID!
  }

  input SubmitGameResultInput {
    gameId: ID!
    result: GameResultInput!
  }

  extend type Query {
    tournamentGames(tournamentId: ID!, roundNumber: Int): [Game!]!
    tournamentStandings(tournamentId: ID!): TournamentStandings!
    tournamentRounds(tournamentId: ID!): [RoundSummary!]!
  }

  extend type Mutation {
    createGame(input: CreateGameInput!): Game!
    submitGameResult(input: SubmitGameResultInput!): SubmitGameResultPayload!
    publishPairings(tournamentId: ID!): PublishPairingsPayload!
    closeTournament(tournamentId: ID!): CloseTournamentPayload!
  }
`;
