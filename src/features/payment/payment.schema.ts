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

  type ReceiptUploadUrl {
    uploadUrl: String!
    token: String!
    path: String!
  }

  input GetReceiptUploadUrlInput {
    registrationId: ID!
    fileName: String!
    mimeType: String!
    amount: Float!
  }

  input ConfirmReceiptUploadInput {
    registrationId: ID!
    path: String!
    amount: Float!
  }

  extend type Query {
    myPayments: [PaymentHistoryEntry!]!
    paymentReceipt(id: ID!): PaymentReceipt
    receiptSignedUrl(paymentReceiptId: ID!): String!
  }

  extend type Mutation {
    getReceiptUploadUrl(input: GetReceiptUploadUrlInput!): ReceiptUploadUrl!
    confirmReceiptUpload(input: ConfirmReceiptUploadInput!): PaymentReceipt!
  }
`;
