const { gql } = require("apollo-server-express");

const typeDefs = gql`
  scalar Upload

  type Media {
    url: String
    type: String
    filename: String
    size: Int
  }

type Message {
  id: ID!
  sender: User!
  receiver: User!
  message: String           # ✅ optional message
  media: Media              # ✅ optional media object
  createdAt: String!
}

  type ZegoTokenResponse {
    token: String!
    roomID: String!
    userID: String!
    username: String!
    appID: Int!
    serverSecret: String!
  }

  input MediaInput {
    url: String
    type: String
    filename: String
    size: Int
  }

  type Query {
    getMessages(senderId: ID!, receiverId: ID!): [Message]
    joinvideocall(roomID: String!): ZegoTokenResponse!
  }

  type Mutation {
    sendMessage(
      senderId: ID!
      receiverId: ID!
      message: String
      media: MediaInput
    ): Message
    sendMessageWithFile(
      senderId: ID!
      receiverId: ID!
      message: String
      file: Upload
    ): Message
    deleteMessage(messageId: ID!): Boolean
  }
`;

module.exports = typeDefs;
