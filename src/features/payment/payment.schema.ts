export const paymentTypeDefs = `
  enum PaymentReceiptStatus {
    PENDING
    VALIDATED
    REJECTED
  }

  type PaymentValidator {
    id: ID!
    fullName: String!
  }

  type PaymentTournament {
    id: ID!
    name: String!
  }

  type PaymentPlayer {
    id: ID!
    fullName: String!
  }

  type PaymentRegistration {
    id: ID!
    tournament: PaymentTournament!
    player: PaymentPlayer!
  }

  type PaymentReceipt {
    id: ID!
    amount: Float!
    date: String!
    fileUrl: String!
    status: PaymentReceiptStatus!
    validatedAt: String
    validatedBy: PaymentValidator
    registration: PaymentRegistration
    licenseId: ID
  }

  type PaymentHistoryEntry {
    id: ID!
    amount: Float!
    date: String!
    status: PaymentReceiptStatus!
    validatedAt: String
    tournamentName: String
  }

  extend type Query {
    myPayments: [PaymentHistoryEntry!]!
    paymentReceipt(id: ID!): PaymentReceipt
  }
`;
