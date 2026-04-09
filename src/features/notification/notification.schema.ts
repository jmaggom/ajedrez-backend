export const notificationTypeDefs = `
  enum NotificationType {
    TOURNAMENT
    REGISTRATION
    PAYMENT
    SYSTEM
  }

  enum NotificationStatus {
    PENDING
    SENT
    FAILED
    SKIPPED
  }

  type Notification {
    id: ID!
    type: NotificationType!
    status: NotificationStatus!
    title: String!
    message: String!
    isRead: Boolean!
    createdAt: String!
  }

  type NotificationConnection {
    nodes: [Notification!]!
    totalCount: Int!
  }

  extend type Query {
    myNotifications(limit: Int, offset: Int): NotificationConnection!
  }

  extend type Mutation {
    markNotificationAsRead(id: ID!): Boolean!
  }
`;
