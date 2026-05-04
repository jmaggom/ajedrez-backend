import { PrismaClient, Role, TournamentStatus, RegistrationStatus, LicenseStatus, LicenseType, GameResult, EloSource, RegistrationMethod, PaymentStatus, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── NOMBRES ESPAÑOLES ────────────────────────────────────────────────────

const nombres = [
  'Carlos', 'Miguel', 'Antonio', 'José', 'Manuel', 'David', 'Javier', 'Pedro', 'Pablo', 'Alejandro',
  'Luis', 'Sergio', 'Jorge', 'Roberto', 'Fernando', 'María', 'Carmen', 'Ana', 'Laura', 'Isabel',
  'Lucía', 'Marta', 'Elena', 'Patricia', 'Rosa', 'Cristina', 'Sara', 'Nuria', 'Pilar', 'Silvia',
  'Diego', 'Álvaro', 'Adrián', 'Rubén', 'Víctor', 'Raúl', 'Iván', 'Óscar', 'Enrique', 'Francisco',
  'Beatriz', 'Sofía', 'Natalia', 'Verónica', 'Alicia',
];

const apellidos = [
  'García', 'Martínez', 'López', 'Sánchez', 'González', 'Fernández', 'Rodríguez', 'Pérez', 'Gómez', 'Martín',
  'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro',
  'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Suárez', 'Molina',
  'Castro', 'Ortega', 'Delgado', 'Ortiz', 'Rubio',
];

// ─── CLUBS (42 total) ────────────────────────────────────────────────────

const clubsData = [
  // Grandes (índice 0 y 1)
  { name: 'Club Ajedrez Sevilla', community: 'Andalucía', shortCode: 'CAS' },
  { name: 'Real Club Ajedrez Madrid', community: 'Madrid', shortCode: 'RCAM' },
  // Vacíos (índice 2, 3, 4)
  { name: 'Club Escaques Almería', community: 'Andalucía', shortCode: 'CEA' },
  { name: 'Sociedad Ajedrez Teruel', community: 'Aragón', shortCode: 'SAT' },
  { name: 'Club Ajedrez Soria', community: 'Castilla y León', shortCode: 'CAS2' },
  // Resto (37 clubs)
  { name: 'Club Ajedrez Granada', community: 'Andalucía', shortCode: 'CAG' },
  { name: 'Club Ajedrez Málaga', community: 'Andalucía', shortCode: 'CAM' },
  { name: 'Club Ajedrez Córdoba', community: 'Andalucía', shortCode: 'CAC' },
  { name: 'Club Ajedrez Zaragoza', community: 'Aragón', shortCode: 'CAZ' },
  { name: 'Club Ajedrez Huesca', community: 'Aragón', shortCode: 'CAH' },
  { name: 'Club Ajedrez Oviedo', community: 'Asturias', shortCode: 'CAO' },
  { name: 'Club Ajedrez Gijón', community: 'Asturias', shortCode: 'CAGi' },
  { name: 'Club Ajedrez Palma', community: 'Baleares', shortCode: 'CAP' },
  { name: 'Club Ajedrez Las Palmas', community: 'Canarias', shortCode: 'CALP' },
  { name: 'Club Ajedrez Tenerife', community: 'Canarias', shortCode: 'CATEN' },
  { name: 'Club Ajedrez Santander', community: 'Cantabria', shortCode: 'CASAN' },
  { name: 'Club Ajedrez Toledo', community: 'Castilla-La Mancha', shortCode: 'CATO' },
  { name: 'Club Ajedrez Albacete', community: 'Castilla-La Mancha', shortCode: 'CAAB' },
  { name: 'Club Ajedrez Salamanca', community: 'Castilla y León', shortCode: 'CASAL' },
  { name: 'Club Ajedrez Valladolid', community: 'Castilla y León', shortCode: 'CAVA' },
  { name: 'Club Ajedrez Burgos', community: 'Castilla y León', shortCode: 'CABU' },
  { name: 'Club Ajedrez Barcelona', community: 'Cataluña', shortCode: 'CAB' },
  { name: 'Club Ajedrez Tarragona', community: 'Cataluña', shortCode: 'CATAR' },
  { name: 'Club Ajedrez Lleida', community: 'Cataluña', shortCode: 'CALL' },
  { name: 'Club Ajedrez Girona', community: 'Cataluña', shortCode: 'CAGI' },
  { name: 'Club Ajedrez Badajoz', community: 'Extremadura', shortCode: 'CABAD' },
  { name: 'Club Ajedrez Mérida', community: 'Extremadura', shortCode: 'CAME' },
  { name: 'Club Ajedrez Santiago', community: 'Galicia', shortCode: 'CASANT' },
  { name: 'Club Ajedrez Vigo', community: 'Galicia', shortCode: 'CAVI' },
  { name: 'Club Ajedrez A Coruña', community: 'Galicia', shortCode: 'CAAC' },
  { name: 'Club Ajedrez Logroño', community: 'La Rioja', shortCode: 'CALO' },
  { name: 'Club Ajedrez Alcalá', community: 'Madrid', shortCode: 'CAAL' },
  { name: 'Club Ajedrez Getafe', community: 'Madrid', shortCode: 'CAGE' },
  { name: 'Club Ajedrez Murcia', community: 'Murcia', shortCode: 'CAMU' },
  { name: 'Club Ajedrez Cartagena', community: 'Murcia', shortCode: 'CACAR' },
  { name: 'Club Ajedrez Pamplona', community: 'Navarra', shortCode: 'CAPAM' },
  { name: 'Club Ajedrez Bilbao', community: 'País Vasco', shortCode: 'CABIL' },
  { name: 'Club Ajedrez San Sebastián', community: 'País Vasco', shortCode: 'CASS' },
  { name: 'Club Ajedrez Vitoria', community: 'País Vasco', shortCode: 'CAVI2' },
  { name: 'Club Ajedrez Valencia', community: 'Valencia', shortCode: 'CAVAVAL' },
  { name: 'Club Ajedrez Alicante', community: 'Valencia', shortCode: 'CAALI' },
  { name: 'Club Ajedrez Castellón', community: 'Valencia', shortCode: 'CACAST' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────

/**
 * PRNG seeded para reproducibilidad
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/**
 * Genera un nombre aleatorio
 */
function generateName(index: number): string {
  const rand = seededRandom(index * 7919);
  const nombre = nombres[Math.floor(rand() * nombres.length)];
  const apellido1 = apellidos[Math.floor(rand() * apellidos.length)];
  const apellido2 = apellidos[Math.floor(rand() * apellidos.length)];
  return `${nombre} ${apellido1} ${apellido2}`;
}

/**
 * Genera valores de elo realistas
 */
function generateElo(seed: number) {
  const base = 800 + (seed % 1800);
  const fadaBonus = 20;
  const onlineBonus = 100;

  return {
    fideClassical: base,
    fideRapid: Math.max(800, base - 50),
    fideBlitz: Math.max(800, base - 100),
    fadaClassical: Math.max(800, base + fadaBonus),
    fadaRapid: Math.max(800, base - 30),
    fadaBlitz: Math.max(800, base - 80),
    onlineClassical: Math.max(800, base + onlineBonus),
    onlineRapid: Math.max(800, base + 50),
    onlineBlitz: Math.max(800, base),
    fideClassicalGames: 20 + (seed % 200),
    fideRapidGames: 10 + (seed % 100),
    fideBlitzGames: 15 + (seed % 150),
    fadaClassicalGames: 10 + (seed % 80),
    fadaRapidGames: 5 + (seed % 50),
    fadaBlitzGames: 8 + (seed % 60),
    onlineClassicalGames: 30 + (seed % 300),
    onlineRapidGames: 50 + (seed % 500),
    onlineBlitzGames: 100 + (seed % 1000),
  };
}

/**
 * Genera pairings round-robin
 */
function generateRoundRobinPairings(playerIds: number[]): Array<{ white: number; black: number; round: number }> {
  const pairings: Array<{ white: number; black: number; round: number }> = [];
  let roundNumber = 1;

  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      pairings.push({
        white: playerIds[i],
        black: playerIds[j],
        round: roundNumber,
      });
      roundNumber++;
    }
  }

  return pairings;
}

/**
 * Genera pairings suizos por ronda (rotación Berger)
 * Fija el primer jugador y rota el resto para evitar repeticiones.
 */
function generateSwissRoundPairings(playerIds: number[], roundNumber: number): Array<{ white: number; black: number }> {
  const pairings: Array<{ white: number; black: number }> = [];
  const ids = [...playerIds];
  // Si el número de jugadores es impar, añadir un "bye" ficticio
  if (ids.length % 2 !== 0) ids.push(-1);

  const fixed = ids[0];
  const rotating = ids.slice(1);
  const offset = (roundNumber - 1) % rotating.length;
  const rotated = [...rotating.slice(offset), ...rotating.slice(0, offset)];
  const circle = [fixed, ...rotated];

  const half = circle.length / 2;
  for (let i = 0; i < half; i++) {
    const white = circle[i];
    const black = circle[circle.length - 1 - i];
    if (white !== -1 && black !== -1) {
      pairings.push({ white, black });
    }
  }
  return pairings;
}

/**
 * Determina el resultado de una partida de forma seeded
 */
function getGameResult(seed: number): GameResult {
  const rand = seededRandom(seed);
  const value = rand();
  if (value < 0.4) return GameResult.white_wins;
  if (value < 0.75) return GameResult.black_wins;
  return GameResult.draw;
}

/**
 * Calcula puntos de una partida
 */
function getPoints(result: GameResult, isWhite: boolean): number {
  if (result === GameResult.draw) return 0.5;
  if (result === GameResult.white_wins) return isWhite ? 1 : 0;
  return isWhite ? 0 : 1;
}

// ─── CLEAN DATABASE ───────────────────────────────────────────────────────

async function cleanDatabase() {
  await prisma.notification.deleteMany();
  await prisma.paymentReceipt.deleteMany();
  await prisma.tournamentResult.deleteMany();
  await prisma.game.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.eloHistory.deleteMany();
  await prisma.license.deleteMany();
  await prisma.mobileSession.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.player.deleteMany();
  await prisma.elo.deleteMany();
  await prisma.delegate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.club.deleteMany();
  console.log('🧹 Base de datos limpiada');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding...');

  await cleanDatabase();

  const password = await bcrypt.hash('Password123!', 10);

  // ─── CREAR ADMIN ────────────────────────────────────────────────────────

  await prisma.user.create({
    data: {
      email: 'admin@faa.es',
      password,
      role: Role.admin,
      fullName: 'Administrador FAA',
    },
  });

  console.log('✅ Admin creado');

  // ─── CREAR CLUBS ────────────────────────────────────────────────────────

  const clubs = await Promise.all(
    clubsData.map((club, index) =>
      prisma.club.create({
        data: {
          name: club.name,
          CIF: `A${(index + 1).toString().padStart(8, '0')}`,
          address: `Calle Mayor ${index + 1}, ${club.community}`,
          phone: `+34 9${(10 + index).toString().padStart(2, '0')} ${(100 + index).toString().padStart(3, '0')} ${(100 + index * 2).toString().padStart(3, '0')}`,
          email: `info@${club.shortCode.toLowerCase()}.es`,
          shortCode: club.shortCode,
          planActivo: index < 20, // 20 primeros con plan activo
        },
      })
    )
  );

  console.log(`✅ ${clubs.length} clubs creados`);

  // ─── CREAR DELEGATES ────────────────────────────────────────────────────
  // Los 2 primeros delegados (Sevilla y Madrid) también serán jugadores activos

  const delegates: Array<{ user: Prisma.UserGetPayload<object>; isPlayer: boolean; playerId?: number }> = [];
  const delegatePlayerIds: number[] = [];

  for (let index = 0; index < clubs.length; index++) {
    const club = clubs[index];
    const fullName = generateName(index + 10000);
    const user = await prisma.user.create({
      data: {
        email: `delegado.${index + 1}@${club.shortCode.toLowerCase()}.es`,
        password,
        role: Role.delegate,
        fullName,
        phone: `+34 6${(index + 10).toString().padStart(2, '0')} ${(100 + index).toString().padStart(3, '0')} ${(200 + index).toString().padStart(3, '0')}`,
      },
    });

    await prisma.delegate.create({
      data: { userId: user.id, clubId: club.id },
    });

    // Delegados 0 y 1 (Sevilla y Madrid) también son jugadores activos
    if (index === 0 || index === 1) {
      const eloData = generateElo(index + 90000);
      const elo = await prisma.elo.create({ data: eloData });

      const birthYear = 1970 + (index * 5);
      const player = await prisma.player.create({
        data: {
          userId: user.id,
          birthDate: new Date(`${birthYear}-06-15`),
          NIF: `D${(40000000 + index).toString()}`,
          fideId: `24${(116498 + index).toString()}`,
          federation: 'FADA',
          clubId: club.id,
          eloId: elo.id,
        },
      });

      delegates.push({ user, isPlayer: true, playerId: player.id });
      delegatePlayerIds.push(player.id);
    } else {
      delegates.push({ user, isPlayer: false });
    }
  }

  console.log(`✅ ${delegates.length} delegates creados (2 también son jugadores)`);

  // ─── CREAR JUGADORES ────────────────────────────────────────────────────

  // Clubs grandes: índice 0 y 1 → 52 jugadores cada uno
  // Clubs vacíos: índice 2, 3, 4 → 0 jugadores
  // Resto: 2-8 jugadores (random seeded)
  // Sin club: 20 jugadores

  const playersByClub: Record<number, number[]> = {};
  const allPlayerIds: number[] = [];
  let nifCounter = 30000000;
  let userIndex = 50000;

  // Clubs grandes
  for (const clubIndex of [0, 1]) {
    const club = clubs[clubIndex];
    const count = 52;
    const playerIds: number[] = [];

    for (let i = 0; i < count; i++) {
      const fullName = generateName(userIndex);
      const user = await prisma.user.create({
        data: {
          email: `${fullName.toLowerCase().replace(/\s+/g, '.')}.${userIndex}@mail.com`,
          password,
          role: Role.player,
          fullName,
        },
      });

      const eloData = generateElo(userIndex);
      const elo = await prisma.elo.create({ data: eloData });

      const birthYear = 1960 + ((userIndex * 7) % 45);
      const birthMonth = 1 + (userIndex % 12);
      const birthDay = 1 + (userIndex % 28);

      const player = await prisma.player.create({
        data: {
          userId: user.id,
          birthDate: new Date(`${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`),
          NIF: `P${nifCounter++}`,
          fideId: userIndex % 3 === 0 ? `FAA${userIndex.toString().padStart(7, '0')}` : undefined,
          federation: userIndex % 2 === 0 ? 'FADA' : 'FEDA',
          clubId: club.id,
          eloId: elo.id,
        },
      });

      playerIds.push(player.id);
      allPlayerIds.push(player.id);
      userIndex++;
    }

    playersByClub[club.id] = playerIds;
  }

  // Clubs vacíos: sin jugadores
  for (const clubIndex of [2, 3, 4]) {
    playersByClub[clubs[clubIndex].id] = [];
  }

  // Resto de clubs: 2-8 jugadores
  for (let clubIndex = 5; clubIndex < clubs.length; clubIndex++) {
    const club = clubs[clubIndex];
    const rand = seededRandom(clubIndex * 31);
    const count = 2 + Math.floor(rand() * 7); // 2-8
    const playerIds: number[] = [];

    for (let i = 0; i < count; i++) {
      const fullName = generateName(userIndex);
      const user = await prisma.user.create({
        data: {
          email: `${fullName.toLowerCase().replace(/\s+/g, '.')}.${userIndex}@mail.com`,
          password,
          role: Role.player,
          fullName,
        },
      });

      const eloData = generateElo(userIndex);
      const elo = await prisma.elo.create({ data: eloData });

      const birthYear = 1960 + ((userIndex * 7) % 45);
      const birthMonth = 1 + (userIndex % 12);
      const birthDay = 1 + (userIndex % 28);

      const player = await prisma.player.create({
        data: {
          userId: user.id,
          birthDate: new Date(`${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`),
          NIF: `P${nifCounter++}`,
          fideId: userIndex % 3 === 0 ? `FAA${userIndex.toString().padStart(7, '0')}` : undefined,
          federation: userIndex % 2 === 0 ? 'FADA' : 'FEDA',
          clubId: club.id,
          eloId: elo.id,
        },
      });

      playerIds.push(player.id);
      allPlayerIds.push(player.id);
      userIndex++;
    }

    playersByClub[club.id] = playerIds;
  }

  // Jugadores sin club
  const playersWithoutClub: number[] = [];
  for (let i = 0; i < 20; i++) {
    const fullName = generateName(userIndex);
    const user = await prisma.user.create({
      data: {
        email: `${fullName.toLowerCase().replace(/\s+/g, '.')}.${userIndex}@mail.com`,
        password,
        role: Role.player,
        fullName,
      },
    });

    const eloData = generateElo(userIndex);
    const elo = await prisma.elo.create({ data: eloData });

    const birthYear = 1960 + ((userIndex * 7) % 45);
    const birthMonth = 1 + (userIndex % 12);
    const birthDay = 1 + (userIndex % 28);

    const player = await prisma.player.create({
      data: {
        userId: user.id,
        birthDate: new Date(`${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`),
        NIF: `P${nifCounter++}`,
        fideId: userIndex % 3 === 0 ? `FAA${userIndex.toString().padStart(7, '0')}` : undefined,
        federation: userIndex % 2 === 0 ? 'FADA' : 'FEDA',
        clubId: null,
        eloId: elo.id,
      },
    });

    playersWithoutClub.push(player.id);
    allPlayerIds.push(player.id);
    userIndex++;
  }

  console.log(`✅ ${allPlayerIds.length} jugadores creados`);

  // ─── CREAR TORNEOS ──────────────────────────────────────────────────────

  const tournamentsData: Array<{ clubId: number; tournament: Awaited<ReturnType<typeof prisma.tournament.create>>; players: number[] }> = [];
  const now = new Date('2026-04-24');

  for (const club of clubs) {
    const clubPlayers = playersByClub[club.id] || [];
    const isEmptyClub = [2, 3, 4].includes(clubs.indexOf(club));
    const clubIndex = clubs.indexOf(club);

    // Torneo 1 — FINISHED (solo para clubs con jugadores)
    if (!isEmptyClub && clubPlayers.length >= 4) {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);

      const registrationFees = [0, 10, 15, 20];
      const registrationFee = registrationFees[clubIndex % registrationFees.length];

      const tournamentFinished = await prisma.tournament.create({
        data: {
          name: `Open Invierno 2025 — ${club.name}`,
          organizerId: club.id,
          venue: `${club.name} — Sala Principal`,
          startDate,
          endDate,
          format: 'Round Robin',
          rounds: 7,
          timeControl: '90+30',
          mode: 'classical',
          availableSlots: 16,
          registrationFee,
          status: TournamentStatus.finished,
          description: 'Torneo de invierno finalizado',
          eloEligible: true,
          requirements: {},
        },
      });

      // Máximo 8 jugadores para round-robin (28 partidas)
      const participatingPlayers = clubPlayers.slice(0, Math.min(8, clubPlayers.length));

      tournamentsData.push({
        clubId: club.id,
        tournament: tournamentFinished,
        players: participatingPlayers,
      });
    }

    // Torneo 2 — IN_PROGRESS
    {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 14);

      const tournamentInProgress = await prisma.tournament.create({
        data: {
          name: `Campeonato Primavera 2026 — ${club.name}`,
          organizerId: club.id,
          venue: `${club.name} — Sala A`,
          startDate,
          endDate,
          format: 'Suizo',
          rounds: 9,
          timeControl: '90+30',
          mode: 'classical',
          availableSlots: 24,
          registrationFee: 15,
          status: TournamentStatus.in_progress,
          description: 'Campeonato en curso',
          eloEligible: true,
          requirements: {},
        },
      });

      const participatingPlayers = clubPlayers.slice(0, Math.min(clubPlayers.length, 12));

      if (participatingPlayers.length > 0) {
        tournamentsData.push({
          clubId: club.id,
          tournament: tournamentInProgress,
          players: participatingPlayers,
        });
      }
    }

    // Torneo 3 — OPEN
    {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() + 60);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const tournamentOpen = await prisma.tournament.create({
        data: {
          name: `Open Verano 2026 — ${club.name}`,
          organizerId: club.id,
          venue: `${club.name} — Sala Principal`,
          startDate,
          endDate,
          format: 'Suizo',
          rounds: 9,
          timeControl: '90+30',
          mode: 'classical',
          availableSlots: 32,
          registrationFee: 20,
          status: TournamentStatus.open,
          description: 'Torneo abierto de verano',
          eloEligible: true,
          requirements: {},
        },
      });

      // 2-4 jugadores inscritos
      const rand = seededRandom(clubIndex * 47);
      const count = clubPlayers.length > 0 ? Math.min(2 + Math.floor(rand() * 3), clubPlayers.length) : 0;
      const participatingPlayers = clubPlayers.slice(0, count);

      if (participatingPlayers.length > 0) {
        tournamentsData.push({
          clubId: club.id,
          tournament: tournamentOpen,
          players: participatingPlayers,
        });
      }
    }

    // Torneo 4 — OPEN o DRAFT (alterna según club par/impar)
    {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() + 150);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const isOpen = clubIndex % 2 === 0;

      await prisma.tournament.create({
        data: {
          name: isOpen ? `Rápidas Otoño 2026 — ${club.name}` : `Copa Club 2026 — ${club.name}`,
          organizerId: club.id,
          venue: `${club.name} — Sala B`,
          startDate,
          endDate,
          format: 'Suizo',
          rounds: 7,
          timeControl: isOpen ? '15+10' : '60+15',
          mode: isOpen ? 'rapid' : 'classical',
          availableSlots: 24,
          registrationFee: 10,
          status: isOpen ? TournamentStatus.open : TournamentStatus.draft,
          description: isOpen ? 'Torneo rápidas de otoño' : 'Copa del club (borrador)',
          eloEligible: false,
          requirements: {},
        },
      });
    }
  }

  console.log(`✅ Torneos creados (${clubs.length * 4} torneos en total)`);

  // ─── CREAR REGISTRACIONES ──────────────────────────────────────────────

  const registrations: Array<{ playerId: number; tournamentId: number; status: RegistrationStatus }> = [];

  for (const { tournament, players } of tournamentsData) {
    if (tournament.status === TournamentStatus.finished || tournament.status === TournamentStatus.in_progress) {
      // Todos confirmados
      for (const playerId of players) {
        registrations.push({
          playerId,
          tournamentId: tournament.id,
          status: RegistrationStatus.confirmed,
        });
      }
    } else if (tournament.status === TournamentStatus.open) {
      // Mix de confirmed y pending
      for (let i = 0; i < players.length; i++) {
        registrations.push({
          playerId: players[i],
          tournamentId: tournament.id,
          status: i % 3 === 0 ? RegistrationStatus.pending : RegistrationStatus.confirmed,
        });
      }
    }
  }

  await prisma.registration.createMany({
    data: registrations.map(r => ({
      playerId: r.playerId,
      tournamentId: r.tournamentId,
      status: r.status,
      paymentStatus: PaymentStatus.validated,
      method: RegistrationMethod.self,
    })),
  });

  console.log(`✅ ${registrations.length} registraciones creadas`);

  // ─── CREAR PAYMENT RECEIPTS ────────────────────────────────────────────

  // Buscar el club de Sevilla (índice 0)
  const sevillaClub = clubs[0];

  // Obtener torneos del club de Sevilla
  const sevillaTournaments = await prisma.tournament.findMany({
    where: { organizerId: sevillaClub.id },
    include: {
      registrations: {
        include: {
          player: true,
        },
      },
    },
  });

  // Crear PaymentReceipts para registraciones del club de Sevilla
  const paymentReceiptsData: Array<Prisma.PaymentReceiptCreateManyInput> = [];

  let receiptCounter = 1;
  for (const tournament of sevillaTournaments) {
    // Solo para torneos OPEN o IN_PROGRESS con registraciones
    if ((tournament.status === TournamentStatus.open || tournament.status === TournamentStatus.in_progress) && tournament.registrations.length > 0) {
      const registrationsToProcess = tournament.registrations.slice(0, Math.min(6, tournament.registrations.length));

      for (let i = 0; i < registrationsToProcess.length; i++) {
        const registration = registrationsToProcess[i];
        let status: PaymentStatus;

        // Variedad de estados:
        // Primeros 3-4: pending
        // Siguientes 1-2: validated
        // Último: rejected
        if (i < 3) {
          status = PaymentStatus.pending;
        } else if (i === registrationsToProcess.length - 1 && registrationsToProcess.length > 4) {
          status = PaymentStatus.rejected;
        } else {
          status = PaymentStatus.validated;
        }

        // Fecha reciente (últimos 30 días)
        const receiptDate = new Date(now);
        receiptDate.setDate(receiptDate.getDate() - (i * 5 + 2)); // Escalonar fechas

        paymentReceiptsData.push({
          registrationId: registration.id,
          amount: tournament.registrationFee,
          date: receiptDate,
          status,
          fileUrl: `https://storage.faa.es/receipts/${sevillaClub.shortCode.toLowerCase()}/receipt-${receiptCounter.toString().padStart(4, '0')}.pdf`,
          validatedById: status === PaymentStatus.validated ? delegates[0].user.id : undefined, // Delegado de Sevilla valida
          validatedAt: status === PaymentStatus.validated ? new Date(receiptDate.getTime() + 24 * 60 * 60 * 1000) : undefined, // 24h después
        });

        receiptCounter++;
      }
    }
  }

  if (paymentReceiptsData.length > 0) {
    await prisma.paymentReceipt.createMany({ data: paymentReceiptsData });
    console.log(`✅ ${paymentReceiptsData.length} comprobantes de pago creados para ${sevillaClub.name}`);
  } else {
    console.log('⚠️  No se crearon comprobantes de pago (sin registraciones elegibles)');
  }

  // ─── CREAR PARTIDAS (solo torneos FINISHED) ────────────────────────────

  let totalGames = 0;

  for (const { tournament, players } of tournamentsData) {
    if (tournament.status !== TournamentStatus.finished) continue;

    const pairings = generateRoundRobinPairings(players);

    const games = pairings.map((pairing, idx) => {
      const result = getGameResult(tournament.id * 1000 + idx);
      return {
        tournamentId: tournament.id,
        roundNumber: pairing.round,
        whitePlayerId: pairing.white,
        blackPlayerId: pairing.black,
        result,
        eloEligible: true,
      };
    });

    await prisma.game.createMany({ data: games });

    totalGames += games.length;

    // ─── CALCULAR TOURNAMENT RESULTS ────────────────────────────────────

    const pointsMap: Record<number, number> = {};
    const statsMap: Record<number, { winsAsWhite: number; drawsAsWhite: number; lossesAsWhite: number; winsAsBlack: number; drawsAsBlack: number; lossesAsBlack: number }> = {};

    for (const playerId of players) {
      pointsMap[playerId] = 0;
      statsMap[playerId] = {
        winsAsWhite: 0,
        drawsAsWhite: 0,
        lossesAsWhite: 0,
        winsAsBlack: 0,
        drawsAsBlack: 0,
        lossesAsBlack: 0,
      };
    }

    for (const game of games) {
      // Puntos
      pointsMap[game.whitePlayerId] += getPoints(game.result, true);
      pointsMap[game.blackPlayerId] += getPoints(game.result, false);

      // Estadísticas
      if (game.result === GameResult.white_wins) {
        statsMap[game.whitePlayerId].winsAsWhite++;
        statsMap[game.blackPlayerId].lossesAsBlack++;
      } else if (game.result === GameResult.black_wins) {
        statsMap[game.whitePlayerId].lossesAsWhite++;
        statsMap[game.blackPlayerId].winsAsBlack++;
      } else {
        statsMap[game.whitePlayerId].drawsAsWhite++;
        statsMap[game.blackPlayerId].drawsAsBlack++;
      }
    }

    // Ordenar por puntos
    const sortedPlayers = [...players].sort((a, b) => pointsMap[b] - pointsMap[a]);

    const results = sortedPlayers.map((playerId, index) => ({
      playerId,
      tournamentId: tournament.id,
      finalPosition: index + 1,
      points: pointsMap[playerId],
      winsAsWhite: statsMap[playerId].winsAsWhite,
      drawsAsWhite: statsMap[playerId].drawsAsWhite,
      lossesAsWhite: statsMap[playerId].lossesAsWhite,
      winsAsBlack: statsMap[playerId].winsAsBlack,
      drawsAsBlack: statsMap[playerId].drawsAsBlack,
      lossesAsBlack: statsMap[playerId].lossesAsBlack,
      eloEligible: true,
      isFideRated: false,
      isFadaRated: true,
    }));

    await prisma.tournamentResult.createMany({ data: results });
  }

  console.log(`✅ ${totalGames} partidas creadas`);

  // ─── PARTIDAS EN CURSO — TORNEO SEVILLA ─────────────────────────────────────
  // Rondas 1-3: completadas. Ronda 4: en curso (60% con resultado). Rondas 5-9: sin partidas.

  const sevillaInProgressTournament = await prisma.tournament.findFirst({
    where: { organizerId: sevillaClub.id, status: TournamentStatus.in_progress },
    include: {
      registrations: {
        where: { status: RegistrationStatus.confirmed },
        select: { playerId: true },
      },
    },
  });

  if (sevillaInProgressTournament && sevillaInProgressTournament.registrations.length >= 4) {
    const sevillaPlayers = sevillaInProgressTournament.registrations.map((r) => r.playerId);
    const tid = sevillaInProgressTournament.id;
    let sevillaGamesCreated = 0;

    // Rondas 1-3: todas las partidas tienen resultado (completadas)
    for (let round = 1; round <= 3; round++) {
      const pairings = generateSwissRoundPairings(sevillaPlayers, round);
      const games = pairings.map((p, idx) => ({
        tournamentId: tid,
        roundNumber: round,
        whitePlayerId: p.white,
        blackPlayerId: p.black,
        result: getGameResult(tid * 1000 + round * 100 + idx),
        eloEligible: true,
      }));
      await prisma.game.createMany({ data: games });
      sevillaGamesCreated += games.length;
    }

    // Ronda 4: en curso — primeras 60% con resultado, el resto sin
    {
      const pairings = generateSwissRoundPairings(sevillaPlayers, 4);
      const withResultCount = Math.ceil(pairings.length * 0.6);
      const games = pairings.map((p, idx) => ({
        tournamentId: tid,
        roundNumber: 4,
        whitePlayerId: p.white,
        blackPlayerId: p.black,
        result: idx < withResultCount ? getGameResult(tid * 1000 + 400 + idx) : null,
        eloEligible: true,
      }));
      await prisma.game.createMany({ data: games });
      sevillaGamesCreated += games.length;
    }

    // Rondas 5-9: sin partidas (pendientes) — no se crean registros

    console.log(`✅ ${sevillaGamesCreated} partidas en curso creadas para ${sevillaInProgressTournament.name}`);
    console.log(`   Rondas 1-3: completadas | Ronda 4: en curso | Rondas 5-9: pendientes`);
  }

  // ─── CREAR LICENCIAS ────────────────────────────────────────────────────
  // Primeros 10 jugadores sin club NO tendrán licencia (empty state)

  const licenses: Array<Prisma.LicenseCreateManyInput> = [];
  const oneYearFromNow = new Date(now);
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  // Delegados que son jugadores: licencia FADA activa
  for (const playerId of delegatePlayerIds) {
    licenses.push({
      playerId,
      licenseNumber: `FADA-2026-DEL${playerId.toString().padStart(4, '0')}`,
      type: LicenseType.fada,
      issuedAt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      expiresAt: oneYearFromNow,
      status: LicenseStatus.active,
    });
  }

  // Jugadores regulares
  for (let i = 0; i < allPlayerIds.length; i++) {
    const playerId = allPlayerIds[i];

    // Primeros 10 jugadores sin club NO tienen licencia (empty state)
    if (playersWithoutClub.includes(playerId) && playersWithoutClub.indexOf(playerId) < 10) {
      continue;
    }

    const mod = i % 100;

    let type: LicenseType;
    let status: LicenseStatus = LicenseStatus.active;
    let expiresAt: Date;
    let issuedAt: Date;

    // 70% FEDA activa
    if (mod < 70) {
      type = LicenseType.feda;
      expiresAt = new Date(oneYearFromNow);
      issuedAt = new Date(now);
      issuedAt.setFullYear(issuedAt.getFullYear() - 1);
    }
    // 20% FIDE activa
    else if (mod < 90) {
      type = LicenseType.fide;
      expiresAt = new Date(oneYearFromNow);
      issuedAt = new Date(now);
      issuedAt.setFullYear(issuedAt.getFullYear() - 1);
    }
    // 10% FADA activa
    else {
      type = LicenseType.fada;
      expiresAt = new Date(oneYearFromNow);
      issuedAt = new Date(now);
      issuedAt.setFullYear(issuedAt.getFullYear() - 1);
    }

    // 15% próximas a vencer
    if (mod % 7 === 0) {
      expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 10);
    }

    // 5% vencidas
    if (mod % 20 === 0) {
      expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() - 60);
      status = LicenseStatus.inactive;
    }

    licenses.push({
      playerId,
      licenseNumber: `${type.toUpperCase()}-${(2024 + (i % 3))}-${(i + 1).toString().padStart(6, '0')}`,
      type,
      issuedAt,
      expiresAt,
      status,
    });
  }

  await prisma.license.createMany({ data: licenses });

  console.log(`✅ ${licenses.length} licencias creadas (10 jugadores sin licencia para empty state)`);

  // ─── CREAR ELO HISTORY ──────────────────────────────────────────────────
  // 9 periodos: 2024-07 a 2026-04 (cada 3 meses)
  // Fuentes: fide_api, fada_api, online_api

  const periods = ['2024-07', '2024-10', '2025-01', '2025-04', '2025-07', '2025-10', '2026-01', '2026-04'];
  const sources = [EloSource.fide_api, EloSource.fada_api, EloSource.online_api];

  const eloHistoryData: Array<Prisma.EloHistoryCreateManyInput> = [];

  // Incluir delegados que son jugadores en el historial
  const allPlayerIdsWithDelegates = [...allPlayerIds, ...delegatePlayerIds];

  for (const playerId of allPlayerIdsWithDelegates) {
    const player = await prisma.player.findUnique({ where: { id: playerId }, include: { elo: true } });
    if (!player || !player.elo) continue;

    let baseClassical = player.elo.fadaClassical || 1400;

    for (let periodIndex = 0; periodIndex < periods.length; periodIndex++) {
      const period = periods[periodIndex];
      const source = sources[periodIndex % sources.length];

      // Variación aleatoria ±50 por período
      const rand = seededRandom(playerId * 1000 + periodIndex);
      const variation = Math.floor((rand() - 0.5) * 100);
      baseClassical = Math.max(800, Math.min(2600, baseClassical + variation));

      const classical = baseClassical;
      const rapid = Math.max(800, classical - 50 + Math.floor((rand() - 0.5) * 60));
      const blitz = Math.max(800, classical - 100 + Math.floor((rand() - 0.5) * 80));

      const classicalGames = 5 + Math.floor(rand() * 25);
      const rapidGames = 5 + Math.floor(rand() * 25);
      const blitzGames = 5 + Math.floor(rand() * 25);

      eloHistoryData.push({
        playerId,
        source,
        period,
        classical,
        rapid,
        blitz,
        classicalGames,
        rapidGames,
        blitzGames,
      });
    }
  }

  await prisma.eloHistory.createMany({ data: eloHistoryData });

  console.log(`✅ ${eloHistoryData.length} registros de EloHistory creados (8 periodos por jugador)`);

  // ─── RESUMEN FINAL ──────────────────────────────────────────────────────

  const totalUsers = await prisma.user.count();
  const totalPlayers = await prisma.player.count();
  const totalDelegates = await prisma.delegate.count();
  const totalClubs = await prisma.club.count();
  const totalTournaments = await prisma.tournament.count();
  const totalRegistrations = await prisma.registration.count();
  const totalGamesCreated = await prisma.game.count();
  const totalResults = await prisma.tournamentResult.count();
  const totalLicenses = await prisma.license.count();
  const totalEloHistory = await prisma.eloHistory.count();
  const totalPaymentReceipts = await prisma.paymentReceipt.count();

  console.log('');
  console.log('─────────────────────────────────────────');
  console.log('🎉 Seed completado');
  console.log('');
  console.log(`📊 Resumen:`);
  console.log(`   Usuarios:           ${totalUsers}`);
  console.log(`   Jugadores:          ${totalPlayers}`);
  console.log(`   Delegates:          ${totalDelegates} (2 también son jugadores)`);
  console.log(`   Clubs:              ${totalClubs}`);
  console.log(`   Torneos:            ${totalTournaments}`);
  console.log(`   Registraciones:     ${totalRegistrations}`);
  console.log(`   Partidas:           ${totalGamesCreated}`);
  console.log(`   Resultados:         ${totalResults}`);
  console.log(`   Licencias:          ${totalLicenses} (10 jugadores sin licencia)`);
  console.log(`   Comprobantes pago:  ${totalPaymentReceipts}`);
  console.log(`   EloHistory:         ${totalEloHistory} (8 periodos por jugador)`);
  console.log('');
  console.log('🔑 Credenciales:');
  console.log('   Admin:       admin@faa.es');
  console.log('   Password:    Password123!');
  console.log('');
  console.log('👥 Delegados que también son jugadores:');
  console.log('   delegado.1@cas.es    (Club Ajedrez Sevilla)');
  console.log('   delegado.2@rcam.es   (Real Club Ajedrez Madrid)');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
