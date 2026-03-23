# FAA Backend — Convenciones Node.js / Apollo Server / GraphQL

> Complementa el CLAUDE.md raíz. Solo contiene reglas específicas del backend.

## Stack

- Node.js + Express
- TypeScript (estricto) — entry point: `src/index.ts`
- Apollo Server 4 + GraphQL 16
- Prisma ORM 5 + PostgreSQL
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

## Arquitectura: Vertical Slice

Cada feature es un slice autónomo. Los archivos se organizan por dominio de
negocio, no por tipo técnico. Todo lo que pertenece a una feature vive junto.

```
src/
├── index.ts                        # Entry point: Express + ApolloServer<Context>
├── config/
│   └── database.ts                 # Instancia de PrismaClient
├── prisma/
│   ├── schema.prisma               # Schema de la DB (modelos en inglés)
│   └── migrations/
├── common/                         # Infraestructura compartida por TODAS las features
│   ├── context.types.ts            # JwtUser + Context de Apollo
│   └── middlewares/
│       └── auth.middleware.ts      # Extrae y verifica el JWT del request
├── graphql/                        # Solo puntos de merge — no contienen lógica
│   ├── schema/
│   │   └── index.ts                # Merge de todos los typeDefs
│   └── resolvers/
│       └── index.ts                # Merge de todos los resolvers
└── features/                       # Lógica de negocio organizada por dominio
    └── [feature]/
        ├── [feature].schema.ts     # Tipos SDL + queries/mutations de GraphQL
        ├── [feature].resolver.ts   # Solo recibe args y delega al service
        ├── [feature].service.ts    # Lógica de negocio + errores GraphQL
        ├── [feature].model.ts      # Queries de Prisma exclusivamente
        ├── [feature].types.ts      # Tipos TypeScript de inputs/outputs
        └── constants.ts            # Constantes de la feature (no secrets)
```

## Responsabilidad de cada capa

| Capa       | Responsabilidad                                     | Lo que NO debe hacer                        |
| ---------- | --------------------------------------------------- | ------------------------------------------- |
| Schema     | Definir tipos SDL, queries y mutations              | Lógica de negocio, acceso a datos           |
| Resolver   | Recibir args de GraphQL, llamar al service          | Lógica de negocio, queries Prisma, errores  |
| Service    | Lógica de negocio, validaciones, errores GraphQL    | Queries Prisma directas, conocer GraphQL    |
| Model      | Queries de Prisma exclusivamente                    | Lógica de negocio, conocer GraphQL          |
| Middleware | Extraer y verificar JWT, construir contexto Apollo  | Lógica de negocio                           |

**Regla de dependencias**: resolver → service → model. Nunca al revés.

## Patrón completo por feature

```typescript
// features/auth/auth.schema.ts
export const authTypeDefs = `
  input EmailLoginInput {
    email: String!
    password: String!
  }

  type AuthResponse {
    token: String!
  }

  type Query {
    _health: String
  }

  type Mutation {
    emailLogin(input: EmailLoginInput!): AuthResponse!
  }
`;

// features/auth/auth.model.ts — solo Prisma
import { prisma } from "../../config/database";
import { User } from "@prisma/client";

export const findUserByEmail = async (email: string): Promise<User | null> => {
    return prisma.user.findUnique({ where: { email } });
};

// features/auth/auth.service.ts — lógica de negocio
import { GraphQLError } from "graphql";
import * as authModel from "./auth.model";

export const login = async (input: EmailLoginInput): Promise<{ token: string }> => {
    const user = await authModel.findUserByEmail(input.email);
    if (!user) {
        throw new GraphQLError("User not found", { extensions: { code: "NOT_FOUND" } });
    }
    // ... validaciones y generación de token
    return { token };
};

// features/auth/auth.resolver.ts — solo delega
import * as authService from "./auth.service";

export const authResolvers = {
    Mutation: {
        emailLogin: (_: unknown, { input }: { input: EmailLoginInput }, _ctx: Context) =>
            authService.login(input),
    },
};
```

## Puntos de merge — graphql/schema y graphql/resolvers

Los únicos dos archivos que tocan múltiples features. Cuando agregás una feature nueva,
solo hay que actualizar estos dos archivos:

```typescript
// graphql/schema/index.ts
import { authTypeDefs } from "../../features/auth/auth.schema";
import { tournamentTypeDefs } from "../../features/tournament/tournament.schema";

export const typeDefs = [authTypeDefs, tournamentTypeDefs];

// graphql/resolvers/index.ts
import { authResolvers } from "../../features/auth/auth.resolver";
import { tournamentResolvers } from "../../features/tournament/tournament.resolver";

export const resolvers = [authResolvers, tournamentResolvers];
```

## Contexto Apollo

```typescript
// common/context.types.ts
// JwtUser representa lo que el JWT lleva — no es el modelo de Prisma (que incluye password)
export type JwtUser = {
    id: number;
    email: string;
    role: string;
    fullName: string;
}

export type Context = {
    user: JwtUser | null;
}

// common/middlewares/auth.middleware.ts
// Cross-cutting concern — lo usa el index.ts para construir el contexto de Apollo
// NO va dentro de features/auth/ porque es infraestructura compartida
const authMiddleware = async (req: Request): Promise<JwtUser | null> => {
    const token = req.headers.authorization?.replace("JWT ", "").trim();
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    if (!decoded || typeof decoded === "string") return null;
    return decoded as JwtUser;
};
```

## Setup Apollo Server en index.ts

```typescript
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { Context } from "./common/context.types";
import authMiddleware from "./common/middlewares/auth.middleware";

// ApolloServer tipado con Context — obligatorio para que expressMiddleware valide el contrato
const server = new ApolloServer<Context>({ typeDefs, resolvers });
await server.start();

app.use("/graphql", express.json(), expressMiddleware(server, {
    context: async ({ req }) => {
        const user = await authMiddleware(req);
        return { user };
    }
}));
```

## Manejo de errores en GraphQL

Los errores de negocio se lanzan en el **service**, no en el resolver.
GraphQL no usa HTTP status codes — usa `GraphQLError` con `extensions.code`.

```typescript
import { GraphQLError } from "graphql";

throw new GraphQLError("User not found", { extensions: { code: "NOT_FOUND" } });
throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHENTICATED" } });
throw new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN" } });
throw new GraphQLError("Email already in use", { extensions: { code: "BAD_USER_INPUT" } });
```

## Prisma — convenciones

```typescript
// Schema: src/prisma/schema.prisma (ruta no estándar)
// Siempre especificar --schema al ejecutar comandos:
// npx prisma generate --schema=src/prisma/schema.prisma
// npx prisma migrate reset --force --schema=src/prisma/schema.prisma

// Modelos y campos en inglés, PascalCase para modelos, camelCase para campos
// Usar enums de Prisma en lugar de string literals para type safety:
import { Role } from "@prisma/client";
await prisma.user.create({ data: { role: Role.player } }); // ✅
await prisma.user.create({ data: { role: "player" } });    // ❌

// Queries siempre en [feature].model.ts — nunca en service ni resolver
// Evitar N+1 con include explícito:
const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
        organizer: { select: { id: true, name: true } },
    },
});

// Transacciones para operaciones atómicas multi-tabla:
return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { ... } });
    const elo = await tx.elo.create({ data: {} });
    await tx.player.create({ data: { userId: user.id, eloId: elo.id, ... } });
    return user;
});
```

## Variables de entorno y constantes

```
# .env — solo secrets y config específica del entorno
DATABASE_URL=
JWT_SECRET=          # mínimo 32 caracteres aleatorios
FCM_SERVER_KEY=
```

```typescript
// features/[feature]/constants.ts — decisiones de negocio, NO secrets
import type { StringValue } from "ms";

export const JWT_SECRET = process.env.JWT_SECRET as string;
export const JWT_EXPIRATION = "7d" as StringValue; // en código, no en .env
// JWT_EXPIRATION va en código porque es una regla de negocio/seguridad,
// no una configuración de entorno. Cambiarla entre dev y prod sería un riesgo.
```

## Convenciones de naming

- Archivos de feature: `[feature].schema.ts`, `[feature].resolver.ts`, `[feature].service.ts`, `[feature].model.ts`, `[feature].types.ts`
- Modelos Prisma: PascalCase → `User`, `Player`, `Tournament`
- Campos Prisma: camelCase → `fullName`, `birthDate`, `createdAt`
- Tipos GraphQL SDL: PascalCase → `AuthResponse`, `RegisterPlayerInput`
- Queries GraphQL: camelCase → `me`, `tournamentById`
- Mutations GraphQL: camelCase, verbo + sustantivo → `emailLogin`, `registerPlayer`, `createTournament`

## Seguridad — reglas no negociables

- NUNCA exponer `JWT_SECRET` ni ningún secret en responses ni logs
- Validar que `user` existe en el contexto antes de ejecutar cualquier operación protegida
- Los archivos en `/uploads` requieren auth para acceder
- Depth limiting en queries GraphQL para evitar ataques de consultas anidadas
- Rate limiting en mutations costosas (IA, pagos)

## Prohibiciones

- Queries Prisma fuera de `[feature].model.ts`
- Lógica de negocio en resolvers o schema
- `GraphQLError` en resolvers — los errores de negocio van en el service
- `new Error()` para errores de negocio — siempre `GraphQLError` con `extensions.code`
- `any` en TypeScript
- `console.log` en producción
- Secrets hardcodeados
- String literals para valores de enums de Prisma — usar el enum importado
- Importar `User` de `@prisma/client` para el contexto de Apollo — usar `JwtUser` de `common/context.types.ts`
