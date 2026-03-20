-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('admin', 'delegado', 'jugador');

-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('confirmada', 'pendiente', 'lista_espera', 'cancelada');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('pendiente', 'validado', 'rechazado');

-- CreateEnum
CREATE TYPE "MetodoInscripcion" AS ENUM ('autonoma', 'delegado');

-- CreateEnum
CREATE TYPE "EstadoTorneo" AS ENUM ('borrador', 'abierto', 'en_curso', 'finalizado');

-- CreateEnum
CREATE TYPE "EstadoLicencia" AS ENUM ('activa', 'inactiva');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('torneo', 'inscripcion', 'pago', 'sistema');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "telefono" TEXT,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "club_id" INTEGER,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jugador" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3) NOT NULL,
    "NIF" TEXT NOT NULL,
    "licencia_numero" TEXT,
    "club_id" INTEGER,
    "elo_id" INTEGER NOT NULL,
    "fecha_alta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_baja" TIMESTAMP(3),
    "federacion_id" TEXT,

    CONSTRAINT "Jugador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "CIF" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logo_url" TEXT,
    "codigo_corto" TEXT NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Torneo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "organizador_id" INTEGER NOT NULL,
    "sede" TEXT NOT NULL,
    "ubicacion_gps" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "modalidad" TEXT NOT NULL,
    "num_rondas" INTEGER NOT NULL,
    "ritmo_juego" TEXT NOT NULL,
    "plazas_disponibles" INTEGER NOT NULL,
    "tarifa_inscripcion" DOUBLE PRECISION NOT NULL,
    "estado" "EstadoTorneo" NOT NULL DEFAULT 'borrador',
    "descripcion" TEXT,
    "reglas_json" JSONB,

    CONSTRAINT "Torneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" SERIAL NOT NULL,
    "jugador_id" INTEGER NOT NULL,
    "torneo_id" INTEGER NOT NULL,
    "fecha_inscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado_inscripcion" "EstadoInscripcion" NOT NULL DEFAULT 'pendiente',
    "estado_pago" "EstadoPago" NOT NULL DEFAULT 'pendiente',
    "metodo" "MetodoInscripcion" NOT NULL DEFAULT 'autonoma',

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComprobantePago" (
    "id" SERIAL NOT NULL,
    "inscripcion_id" INTEGER,
    "licencia_id" INTEGER,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoPago" NOT NULL DEFAULT 'pendiente',
    "archivo_url" TEXT NOT NULL,

    CONSTRAINT "ComprobantePago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partida" (
    "id" SERIAL NOT NULL,
    "torneo_id" INTEGER NOT NULL,
    "ronda_numero" INTEGER NOT NULL,
    "jugador_blanco_id" INTEGER NOT NULL,
    "jugador_negro_id" INTEGER NOT NULL,
    "resultado" TEXT NOT NULL,
    "movimientos" TEXT,
    "observaciones" TEXT,
    "duracion_segundos" INTEGER,

    CONSTRAINT "Partida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EloHistorial" (
    "id" SERIAL NOT NULL,
    "jugador_id" INTEGER NOT NULL,
    "elo_anterior_id" INTEGER NOT NULL,
    "elo_nuevo_id" INTEGER NOT NULL,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "torneo_id" INTEGER,

    CONSTRAINT "EloHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Licencia" (
    "id" SERIAL NOT NULL,
    "jugador_id" INTEGER NOT NULL,
    "numero_licencia" TEXT NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoLicencia" NOT NULL DEFAULT 'activa',

    CONSTRAINT "Licencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionMovil" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SesionMovil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Elo" (
    "id" SERIAL NOT NULL,
    "fada_clasicas" INTEGER NOT NULL DEFAULT 0,
    "fada_rapidas" INTEGER NOT NULL DEFAULT 0,
    "fada_blitz" INTEGER NOT NULL DEFAULT 0,
    "fide_clasicas" INTEGER NOT NULL DEFAULT 0,
    "fide_rapidas" INTEGER NOT NULL DEFAULT 0,
    "fide_blitz" INTEGER NOT NULL DEFAULT 0,
    "online_clasicas" INTEGER NOT NULL DEFAULT 0,
    "online_rapidas" INTEGER NOT NULL DEFAULT 0,
    "online_blitz" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Elo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "datos_json" JSONB,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_usuario_id_key" ON "Jugador"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_NIF_key" ON "Jugador"("NIF");

-- CreateIndex
CREATE UNIQUE INDEX "Jugador_elo_id_key" ON "Jugador"("elo_id");

-- CreateIndex
CREATE UNIQUE INDEX "Club_CIF_key" ON "Club"("CIF");

-- CreateIndex
CREATE UNIQUE INDEX "Club_codigo_corto_key" ON "Club"("codigo_corto");

-- CreateIndex
CREATE UNIQUE INDEX "ComprobantePago_inscripcion_id_key" ON "ComprobantePago"("inscripcion_id");

-- CreateIndex
CREATE UNIQUE INDEX "Licencia_numero_licencia_key" ON "Licencia"("numero_licencia");

-- CreateIndex
CREATE UNIQUE INDEX "SesionMovil_token_key" ON "SesionMovil"("token");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jugador" ADD CONSTRAINT "Jugador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jugador" ADD CONSTRAINT "Jugador_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jugador" ADD CONSTRAINT "Jugador_elo_id_fkey" FOREIGN KEY ("elo_id") REFERENCES "Elo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Torneo" ADD CONSTRAINT "Torneo_organizador_id_fkey" FOREIGN KEY ("organizador_id") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "Torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobantePago" ADD CONSTRAINT "ComprobantePago_inscripcion_id_fkey" FOREIGN KEY ("inscripcion_id") REFERENCES "Inscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComprobantePago" ADD CONSTRAINT "ComprobantePago_licencia_id_fkey" FOREIGN KEY ("licencia_id") REFERENCES "Licencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "Torneo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_jugador_blanco_id_fkey" FOREIGN KEY ("jugador_blanco_id") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partida" ADD CONSTRAINT "Partida_jugador_negro_id_fkey" FOREIGN KEY ("jugador_negro_id") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EloHistorial" ADD CONSTRAINT "EloHistorial_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EloHistorial" ADD CONSTRAINT "EloHistorial_elo_anterior_id_fkey" FOREIGN KEY ("elo_anterior_id") REFERENCES "Elo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EloHistorial" ADD CONSTRAINT "EloHistorial_elo_nuevo_id_fkey" FOREIGN KEY ("elo_nuevo_id") REFERENCES "Elo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EloHistorial" ADD CONSTRAINT "EloHistorial_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "Torneo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licencia" ADD CONSTRAINT "Licencia_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "Jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionMovil" ADD CONSTRAINT "SesionMovil_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
