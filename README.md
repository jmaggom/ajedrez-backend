# GEFE.CONNECT Backend — API GraphQL

Backend de **GEFE.CONNECT**. API GraphQL construida con Node.js + Apollo Server 4 + Prisma ORM para la gestión integral de torneos de ajedrez: usuarios, clubs, inscripciones, partidas, pagos y notificaciones.

**Estado:** v0.0.1 (MVP en desarrollo) — Trabajo Final de Grado (TFG)

---

## Stack tecnológico

| Aspecto | Tecnología | Versión |
|---------|-----------|---------|
| **Runtime** | Node.js | 18+ (recomendado 20.x LTS) |
| **Framework** | Express | 4 |
| **Lenguaje** | TypeScript | 5.9.3 |
| **GraphQL** | Apollo Server | 4 |
| **ORM** | Prisma | 5 |
| **Base de datos** | PostgreSQL | 14+ |
| **Autenticación** | JWT (jsonwebtoken) | - |
| **Storage de archivos** | Supabase | 2.x |
| **Notificaciones push** | Expo Notification + Expo Server SDK | - |
| **Package manager** | Yarn | 4.x |

---

## Arquitectura

El backend usa **Vertical Slice Architecture** — cada feature es un slice autónomo. Los archivos se organizan por dominio de negocio, no por tipo técnico.

```
src/
├── index.ts                          # Entry point: Express + ApolloServer
├── config/
│   ├── database.ts                   # Instancia única de PrismaClient
│   └── supabase.ts                   # Instancia del cliente Supabase
├── prisma/
│   ├── schema.prisma                 # Modelos y relaciones de la base de datos
│   ├── migrations/                   # Historial de migraciones
│   └── seed.ts                       # Datos de prueba
├── common/                           # Infraestructura compartida por todas las features
│   ├── context.types.ts              # Tipos JwtUser + Context de Apollo
│   ├── middlewares/
│   │   └── auth.middleware.ts        # Extrae y verifica el JWT del request
│   ├── notification/
│   │   ├── notification.model.ts     # Queries de notificaciones a Prisma
│   │   └── notification.service.ts  # Envío de push notifications (Firebase)
│   └── storage/                      # Integración con Supabase Storage
├── graphql/                          # Puntos de merge — no contienen lógica propia
│   ├── schema/
│   │   └── index.ts                  # Merge de todos los typeDefs
│   └── resolvers/
│       └── index.ts                  # Merge de todos los resolvers
└── features/                         # Lógica de negocio por dominio
    ├── auth/                         # Login, registro, JWT
    ├── club/                         # Gestión de clubes
    ├── game/                         # Partidas y resultados
    ├── notification/                 # Centro de notificaciones in-app
    ├── payment/                      # Comprobantes de pago
    ├── tournament/                   # Torneos e inscripciones
    └── user/                         # Perfil de usuario, Elo, licencias
```

Cada feature sigue la misma estructura interna:

```
features/[feature]/
├── [feature].schema.ts     # Tipos SDL + queries/mutations GraphQL
├── [feature].resolver.ts   # Recibe args y delega al service
├── [feature].service.ts    # Lógica de negocio + errores GraphQL
├── [feature].model.ts      # Queries de Prisma exclusivamente
├── [feature].types.ts      # Tipos TypeScript de inputs/outputs
└── __tests__/              # Tests unitarios e integración
```

### Responsabilidad de cada capa

| Capa | Responsabilidad | Lo que NO hace |
|------|----------------|----------------|
| **Schema** | Definir tipos SDL, queries y mutations | Lógica de negocio, acceso a datos |
| **Resolver** | Recibir args de GraphQL, llamar al service | Lógica de negocio, queries Prisma, errores |
| **Service** | Lógica de negocio, validaciones, errores GraphQL | Queries Prisma directas |
| **Model** | Queries de Prisma exclusivamente | Lógica de negocio |
| **Middleware** | Extraer y verificar JWT, construir contexto Apollo | Lógica de negocio |

**Regla de dependencias:** `resolver → service → model`. Nunca al revés.

---

## Modelos de datos (Prisma)

### Enums

| Enum | Valores |
|------|---------|
| `Role` | `admin`, `delegate`, `player`, `referee` |
| `RegistrationStatus` | `confirmed`, `pending`, `cancelled`, `awaiting_payment` |
| `PaymentStatus` | `pending`, `validated`, `rejected` |
| `RegistrationMethod` | `self`, `delegate` |
| `TournamentStatus` | `draft`, `open`, `in_progress`, `finished` |
| `LicenseType` | `fada`, `fide`, `feda`, `online` |
| `LicenseStatus` | `active`, `inactive` |
| `NotificationType` | `tournament`, `registration`, `payment`, `system`, `result` |
| `GameResult` | `white_wins`, `black_wins`, `draw`, `bye` |
| `EloSource` | `fide_api`, `fada_api`, `online_api` |

### Modelos principales

**`User`** — Usuario de la aplicación
- Roles: `admin`, `delegate`, `player`, `referee`
- Campos: `email`, `password` (hash), `role`, `fullName`, `phone`, `pushToken`, `avatarUrl`
- Relaciones: tiene un `Player` o un `Delegate` (mutuamente excluyentes en práctica)

**`Player`** — Perfil del jugador
- Campos: `birthDate`, `NIF`, `fideId`, `federation`, `clubId`, `eloId`
- Soporte de geolocalización: `lastLatitude`, `lastLongitude`, `lastLocationAt`
- Relaciones: `User`, `Club`, `Elo`, `Registration[]`, `License[]`, `EloHistory[]`, `TournamentResult[]`

**`Delegate`** — Delegado vinculado a un club
- Campos: `userId`, `clubId`
- Tiene permisos para crear y gestionar torneos de su club

**`Club`** — Club de ajedrez
- Campos: `name`, `CIF`, `address`, `phone`, `email`, `shortCode`, `planActivo`, `logoUrl`, `website`
- Relaciones: `Delegate[]`, `Player[]`, `Tournament[]`

**`Tournament`** — Torneo de ajedrez
- Campos: `name`, `venue`, `startDate`, `endDate`, `format`, `rounds`, `currentRound`, `timeControl`, `mode`, `availableSlots`, `registrationFee`, `status`, `requirements`
- Geolocalización: `latitude`, `longitude`, `notificationRadius`, `geoNotificationActive`
- Relaciones: `Club` (organizador), `Registration[]`, `Game[]`, `TournamentResult[]`, `TournamentNotifyRequest[]`

**`Registration`** — Inscripción de jugador a torneo
- Campos: `status` (RegistrationStatus), `paymentStatus`, `method`, `registeredAt`
- Relaciones: `Player`, `Tournament`, `PaymentReceipt?`

**`PaymentReceipt`** — Comprobante de pago (almacenado en Supabase)
- Campos: `amount`, `date`, `status` (PaymentStatus), `fileUrl`, `validatedById`, `validatedAt`
- Se asocia a una `Registration` o `License`

**`Game`** — Partida dentro de un torneo
- Campos: `roundNumber`, `tableNumber`, `isBye`, `result` (GameResult), `moves`, `notes`, `durationSeconds`, `eloEligible`
- Jugadores: `whitePlayer`, `blackPlayer`, `byePlayer` (todos opcionales)

**`TournamentResult`** — Resultado final del jugador en un torneo
- Campos: `finalPosition`, `points`, `winsAsWhite`, `drawsAsWhite`, `lossesAsWhite`, etc.
- Cambios de Elo: `eloChangeFide`, `eloChangeFada`, `eloChangeOnline`

**`Elo`** — Calificaciones actuales del jugador
- 9 calificaciones: `fada`/`fide`/`online` × `classical`/`rapid`/`blitz`
- También almacena número de partidas por modalidad

**`EloHistory`** — Histórico temporal de cambios de Elo por período
- Unique por `(playerId, source, period)`

**`License`** — Licencia federativa del jugador
- Tipos: `fada`, `fide`, `feda`, `online`
- Campos: `licenseNumber`, `type`, `issuedAt`, `expiresAt`, `status`

**`Notification`** — Notificación in-app
- Campos: `type`, `status`, `title`, `message`, `dataJson`, `isRead`
- Índice en `(userId, createdAt DESC)` para lecturas eficientes

**`TournamentNotifyRequest`** — Solicitud de aviso cuando haya plaza en un torneo
- Unique por `(userId, tournamentId)`
- Reemplazó al sistema de waitlist anterior

**`MobileSession`** — Sesión de usuario para control de tokens JWT
- Campos: `token`, `createdAt`, `expiresAt`, `isActive`

---

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

```env
# ─── Base de datos PostgreSQL ──────────────────────────────
DATABASE_NAME=faa_dev
DATABASE_USER=tu_usuario
DATABASE_PASSWORD=tu_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_URL=postgresql://tu_usuario:tu_password@localhost:5432/faa_dev

# ─── JWT ───────────────────────────────────────────────────
# Mínimo 32 caracteres aleatorios — no usar en producción el mismo que en dev
JWT_SECRET=tu-secret-aleatorio-de-32-caracteres-minimo

# ─── Supabase ──────────────────────────────────────────────
# Para storage de comprobantes de pago y avatares de usuario
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu-service-role-key-de-supabase
```

> **Nota:** `NODE_ENV` y `PORT` también pueden definirse en `.env`. El servidor corre por defecto en el puerto `4000`.

---

## Cómo empezar

### Prerequisitos

- **Node.js** 18+ (recomendado: 20.x LTS)
- **Yarn** 4.x
- **PostgreSQL** 14+ (local o Docker)
- Una cuenta de **Supabase** (para storage)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/jmaggom/faa-backend.git
cd faa-backend

# Instalar dependencias
yarn install
```

### Configuración de la base de datos

```bash
# 1. Crear la base de datos PostgreSQL
createdb faa_dev

# 2. Ejecutar las migraciones
# IMPORTANTE: el schema está en src/prisma/schema.prisma (ruta no estándar)
npx prisma migrate dev --schema=src/prisma/schema.prisma

# 3. Generar el cliente de Prisma
npx prisma generate --schema=src/prisma/schema.prisma

# 4. (Opcional) Cargar datos de prueba
npx prisma db seed --schema=src/prisma/schema.prisma
```

### Ejecutar en desarrollo

```bash
yarn dev

# El servidor estará disponible en:
# http://localhost:4000/graphql
#
# Apollo Sandbox disponible en el mismo endpoint desde el navegador
# para explorar el schema y ejecutar queries
```

### Ejecutar en producción

```bash
# Compilar TypeScript
yarn build

# Iniciar el servidor compilado
yarn start
```

---

## API GraphQL

El backend expone un único endpoint GraphQL:

```
POST http://localhost:4000/graphql
```

### Autenticación

Las operaciones protegidas requieren el JWT en el header:

```
Authorization: JWT <token>
```

El token se obtiene mediante la mutation `emailLogin` o `registerPlayer`.

### Operaciones principales

**Auth**
- `emailLogin(input)` — Login con email y password, retorna JWT
- `registerPlayer(input)` — Registro de nuevo jugador
- `registerDelegate(input)` — Registro de delegado (público, sin auth)
- `logout` — Invalida la sesión activa

**Torneos**
- `tournaments` — Listar torneos (con filtros opcionales)
- `tournamentById(id)` — Detalle de torneo
- `createTournament(input)` — Crear torneo (solo delegados)
- `updateTournament(id, input)` — Editar torneo
- `openTournament(id)` / `closeTournament(id)` — Cambiar estado

**Inscripciones**
- `registerToTournament(tournamentId)` — Inscribirse a un torneo
- `cancelRegistration(tournamentId)` — Cancelar inscripción
- `uploadPaymentReceipt(input)` — Subir comprobante de pago
- `validatePayment(receiptId)` / `rejectPayment(receiptId, reason)` — Validar/rechazar pago (delegado)

**Usuarios y Perfil**
- `me` — Datos del usuario autenticado
- `updateProfile(input)` — Editar perfil
- `changePassword(input)` — Cambiar contraseña
- `getAvatarUploadUrl` — URL firmada para subir avatar a Supabase
- `confirmAvatarUpload(avatarUrl)` — Confirmar subida de avatar
- `syncFide` — Importar datos desde FIDE

**Clubes**
- `clubs` — Listar clubes
- `clubById(id)` — Detalle de club
- `createClub(input)` / `updateClub(id, input)` — Gestionar club
- `addPlayerToClub(playerId)` / `removePlayerFromClub(playerId)` — Gestionar jugadores del club

**Partidas**
- `registerGame(input)` — Registrar resultado de una partida
- `gamesByTournament(tournamentId)` — Partidas de un torneo

**Notificaciones**
- `myNotifications` — Centro de notificaciones del usuario
- `markNotificationRead(id)` — Marcar como leída
- `requestTournamentNotification(tournamentId)` — Solicitar aviso de plaza disponible

---

## Convenciones de desarrollo

### Errores GraphQL

Los errores de negocio se lanzan siempre en el **service**, nunca en el resolver. Se usa `GraphQLError` con `extensions.code`:

```typescript
import { GraphQLError } from "graphql";

throw new GraphQLError("User not found", { extensions: { code: "NOT_FOUND" } });
throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHENTICATED" } });
throw new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN" } });
throw new GraphQLError("Email already in use", { extensions: { code: "BAD_USER_INPUT" } });
```

### Prisma

```typescript
// ✅ Importar enums de @prisma/client para type safety
import { Role, RegistrationStatus } from "@prisma/client";
await prisma.user.create({ data: { role: Role.player } });

// ✅ Transacciones para operaciones atómicas multi-tabla
return prisma.$transaction(async (tx) => {
  const elo  = await tx.elo.create({ data: {} });
  const user = await tx.user.create({ data: { ... } });
  await tx.player.create({ data: { userId: user.id, eloId: elo.id } });
  return user;
});

// ✅ Comandos Prisma con --schema (ruta no estándar)
npx prisma migrate dev --schema=src/prisma/schema.prisma
npx prisma generate   --schema=src/prisma/schema.prisma
```

### Naming

| Artefacto | Convención |
|-----------|-----------|
| Archivos de feature | `[feature].schema.ts`, `[feature].resolver.ts`, `[feature].service.ts`, `[feature].model.ts` |
| Modelos Prisma | PascalCase: `User`, `Player`, `Tournament` |
| Campos Prisma | camelCase: `fullName`, `birthDate`, `createdAt` |
| Tipos GraphQL SDL | PascalCase: `AuthResponse`, `RegisterPlayerInput` |
| Queries GraphQL | camelCase: `me`, `tournamentById` |
| Mutations GraphQL | camelCase, verbo + sustantivo: `emailLogin`, `createTournament` |

### TypeScript

- `strict: true`
- NO usar `any`
- Para el contexto de Apollo: usar `JwtUser` de `common/context.types.ts`, NO el modelo `User` de Prisma (incluye el password)

---

## Testing

```bash
# Tests unitarios
yarn test

# En modo watch
yarn test:watch

# Solo tests unitarios
yarn test:unit

# Solo tests de integración
yarn test:integration
```

Los tests viven en `features/[feature]/__tests__/` y en `src/__tests__/`.

---

## Linting

```bash
yarn lint
```

---

## Commits (Conventional Commits)

```
<type>(<scope>): <subject>
```

**Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

```bash
git commit -m "feat(tournament): add geolocation-based notifications"
git commit -m "fix(auth): validate JWT expiration on mobile sessions"
git commit -m "chore(deps): update prisma to 5.x"
```

---

## Seguridad

- JWT en header `Authorization: JWT <token>` — verificado en cada request por `auth.middleware.ts`
- Secrets solo en `.env` — nunca en código ni logs
- Errores de auth lanzan `UNAUTHENTICATED` / `FORBIDDEN` sin exponer detalles internos
- Enums de Prisma importados (no string literals) para evitar valores inválidos

---

## Autor

**Joaquín Maguilla Gómez**
Desarrollador full-stack JavaScript/TypeScript
Trabajo Final de Grado — Ingeniería en Sistemas Informáticos

---

Para más información sobre el frontend (app mobile), ver el [repositorio del frontend](https://github.com/jmaggom/faa-frontend).
