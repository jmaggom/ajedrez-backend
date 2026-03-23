import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "./graphql/schema/index";
import { resolvers } from "./graphql/resolvers/index";
import { expressMiddleware } from "@apollo/server/express4";
import authMiddleware from "./common/middlewares/auth.middleware";
import { Context } from "./common/context.types";

dotenv.config();

const startServer = async () => {
  const app = express();
  const PORT = process.env.PORT || 4000;

  app.use(cors());
  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ status: "servidor funcionando" });
  });

  const server = new ApolloServer<Context>({ typeDefs, resolvers });
  await server.start();

  app.use("/graphql", expressMiddleware(server, {
    context: async ({ req }) => {
      const user = await authMiddleware(req);
      return { user };
    }
  }));

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
};

startServer();