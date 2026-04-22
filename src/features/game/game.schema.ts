export const gameTypeDefs = `
  enum GameResultInput {
    WHITE_WINS
    BLACK_WINS
    DRAW
  }

  type GamePlayerElo {
    fideClassical: Int!
    fadaClassical: Int!
  }

  type GamePlayer {
    id: ID!
    fullName: String!
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
    whitePlayer: GamePlayer!
    blackPlayer: GamePlayer!
    result: GameResultInput
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
  }

  extend type Mutation {
    createGame(input: CreateGameInput!): Game!
    submitGameResult(input: SubmitGameResultInput!): SubmitGameResultPayload!
  }
`;
