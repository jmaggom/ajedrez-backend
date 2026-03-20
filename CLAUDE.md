# FAA Backend — Convenciones Node.js / Apollo Server / GraphQL

> Complementa el CLAUDE.md raíz. Solo contiene reglas específicas del backend.

## Stack

- Node.js + Express
- TypeScript (estricto) — entry point: `src/index.ts`
- Apollo Server 5 + GraphQL 16
- Prisma ORM + PostgreSQL
- JWT (autenticación)
- Firebase Cloud Messaging (notificaciones push)
- Multer (subida de archivos — comprobantes de pago)

## Decisión arquitectónica — GraphQL con Apollo Server

GraphQL sobre REST. Justificación: el frontend usa Apollo Client con
graphql-codegen ya configurado. El backend tiene @apollo/server y graphql
instalados. Usar REST sería ir contra el diseño del tooling del proyecto.

graphql-codegen genera automáticamente los tipos TypeScript del frontend
a partir del schema del backend — esto elimina la necesidad de mantener
tipos sincronizados manualmente entre capas.

## Arquitectura: Layered Architecture con GraphQL

```
backend/src/
├── index.ts             # Entry point: Express + Apollo Server
├── config/              # DB, JWT, Firebase, variables de entorno
├── graphql/             # Capa GraphQL (schema + resolvers)
│   ├── schema/          # Definiciones de tipos SDL
│   │   ├── index.ts     # Merge de todos los schemas
│   │   ├── auth.schema.ts
│   │   ├── tournament.schema.ts
│   │   ├── user.schema.ts
│   │   └── club.schema.ts
│   └── resolvers/       # Implementación de queries y mutations
│       ├── index.ts     # Merge de todos los resolvers
│       ├── auth.resolver.ts
│       ├── tournament.resolver.ts
│       ├── user.resolver.ts
│       └── club.resolver.ts
├── services/            # Lógica de negocio (igual que en REST)
├── models/              # Acceso a datos: queries Prisma
├── middlewares/         # Auth JWT, manejo de errores, contexto Apollo
├── uploads/             # Archivos subidos (comprobantes de pago)
└── utils/               # Helpers compartidos
```

## Responsabilidad de cada capa

| Capa       | Responsabilidad                                    | Lo que NO debe hacer                       |
| ---------- | -------------------------------------------------- | ------------------------------------------ |
| Schema     | Definir tipos, queries y mutations en SDL          | Lógica de negocio, acceso a datos          |
| Resolver   | Recibir args, llamar a service, devolver resultado | Lógica de negocio, queries Prisma directas |
| Service    | Lógica de negocio, reglas del dominio              | Conocer GraphQL, queries Prisma directas   |
| Model      | Queries Prisma, transformación de datos            | Lógica de negocio, conocer GraphQL         |
| Middleware | Auth JWT, contexto Apollo                          | Lógica de negocio                          |

## Patrón completo: schema → resolver → service → model

```typescript
// graphql/schema/tournament.schema.ts
export const tournamentTypeDefs = `#graphql
  type Tournament {
    id: ID!
    name: String!
    date: String!
    organizer: User!
    inscriptions: [Inscription!]!
  }

  input CreateTournamentInput {
    name: String!
    date: String!
    location: String!
  }

  extend type Query {
    tournaments: [Tournament!]!
    tournament(id: ID!): Tournament
  }

  extend type Mutation {
    createTournament(input: CreateTournamentInput!): Tournament!
  }
`;

// graphql/resolvers/tournament.resolver.ts
export const tournamentResolvers = {
  Query: {
    tournaments: async (_: unknown, __: unknown, { user }: Context) => {
      if (!user) throw new AuthenticationError("No autenticado");
      return tournamentService.findAll();
    },
  },
  Mutation: {
    createTournament: async (
      _: unknown,
      { input }: { input: CreateTournamentInput },
      { user }: Context,
    ) => {
      if (!user) throw new AuthenticationError("No autenticado");
      if (!["delegado", "admin"].includes(user.role))
        throw new ForbiddenError("Sin permisos");
      return tournamentService.create(input, user.id);
    },
  },
};

// services/tournament.service.ts (igual que en REST — no cambia)
export const create = async (
  input: CreateTournamentInput,
  organizerId: string,
) => {
  const monthlyCount =
    await tournamentModel.countByOrganizerThisMonth(organizerId);
  if (monthlyCount >= 1)
    throw new FreemiumLimitError("Límite mensual alcanzado");
  return tournamentModel.create({ ...input, organizerId });
};

// models/tournament.model.ts (igual que en REST — no cambia)
export const create = async (data: CreateTournamentData) => {
  return prisma.tournament.create({ data });
};
```

## Contexto Apollo (auth JWT)

```typescript
// middlewares/context.ts
// El contexto se inyecta en cada resolver — así funciona auth en GraphQL
export interface Context {
  user?: { id: string; role: "jugador" | "delegado" | "admin" };
}

export const createContext = async ({
  req,
}: {
  req: Request;
}): Promise<Context> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return {};

  try {
    const user = verifyJWT(token);
    return { user };
  } catch {
    return {};
  }
};
```

## Setup Apollo Server en index.ts

```typescript
// src/index.ts
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";
import { createContext } from "./middlewares/context";

const app = express();
const server = new ApolloServer({ typeDefs, resolvers });

await server.start();

app.use(
  "/graphql",
  express.json(),
  expressMiddleware(server, {
    context: createContext,
  }),
);

app.listen(4000, () => console.log("FAA Backend corriendo en :4000/graphql"));
```

## Manejo de errores en GraphQL

```typescript
// GraphQL no usa HTTP status codes — usa errores tipados
import { GraphQLError } from "graphql";

// En resolvers, lanzar errores con código:
throw new GraphQLError("No autenticado", {
  extensions: { code: "UNAUTHENTICATED" },
});

throw new GraphQLError("Sin permisos", {
  extensions: { code: "FORBIDDEN" },
});

throw new GraphQLError("Límite mensual alcanzado", {
  extensions: { code: "FREEMIUM_LIMIT" },
});
```

## Convenciones de naming

- Archivos schema: `[feature].schema.ts`
- Archivos resolver: `[feature].resolver.ts`
- Tipos GraphQL: PascalCase → `Tournament`, `CreateTournamentInput`
- Queries: camelCase, descriptivas → `tournaments`, `tournament(id)`
- Mutations: camelCase, verbo + sustantivo → `createTournament`, `inscribeToTournament`
- Services y models: igual que antes, no cambian

## Prisma — convenciones (no cambian respecto a REST)

```typescript
// Queries siempre en models/, nunca en resolvers ni services
// Evitar N+1 con DataLoader o include explícito
const tournament = await prisma.tournament.findUnique({
  where: { id },
  include: {
    organizer: { select: { id: true, name: true } },
    inscriptions: { where: { status: "confirmed" } },
  },
});
```

## Variables de entorno

```typescript
// config/env.ts — validar al arrancar
const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "CLAUDE_API_KEY",
  "FCM_SERVER_KEY",
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar])
    throw new Error(`Missing required env var: ${envVar}`);
}
```

## Seguridad — reglas no negociables

- NUNCA exponer `CLAUDE_API_KEY` en responses ni logs
- Rate limiting en mutations del asistente IA (límite freemium por usuario)
- Validar inputs en resolvers antes de pasar a services
- Los archivos en `/uploads` requieren auth para acceder
- JWT secret mínimo 32 caracteres aleatorios
- Depth limiting en queries GraphQL para evitar ataques de consultas anidadas

## Prohibiciones

- Queries Prisma fuera de `/models`
- Lógica de negocio en resolvers o schema
- `any` en TypeScript
- `console.log` en producción
- Secrets hardcodeados
- HTTP status codes para errores (usar GraphQLError con extensions.code)
