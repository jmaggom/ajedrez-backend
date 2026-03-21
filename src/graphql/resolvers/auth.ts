import { prisma } from "../../config/database";
import { EmailLoginInput, RegisterJugadorInput, RegisterDelegadoInput } from "../types/auth.types";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Context } from "../types/context.types";

export const authResolvers = {
    Mutation: {
        emailLogin: async (_: unknown, { input }: { input: EmailLoginInput }, _context: Context) => {
            const user = await prisma.usuario.findFirst({
                where: { email: input.email }
            })
            if (!user) {
                throw new Error("Usuario no encontrado");
            }

            const isPasswordValid = await bcrypt.compare(input.password, user.password);
            if (!isPasswordValid) {
                throw new Error("Contraseña incorrecta");
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    rol: user.rol,
                    nombre_completo: user.nombre_completo,
                },
                process.env.JWT_SECRET as string,
                { expiresIn: "7d" }
            );

            return { mToken: token };
        },
        registerJugador: async (_: unknown, { input }: { input: RegisterJugadorInput }, _context: Context) => {
            const existingUser = await prisma.usuario.findFirst({
                where: { email: input.email }
            });
            if (existingUser) {
                throw new Error("Ya existe un usuario con ese email");
            }

            const hashedPassword = await bcrypt.hash(input.password, 10);

            const newUser = await prisma.$transaction(async (tx) => {
                const usuario = await tx.usuario.create({
                    data: {
                        email: input.email,
                        password: hashedPassword,
                        nombre_completo: input.nombre,
                        rol: "jugador",
                    }
                });
                const elo = await tx.elo.create({
                    data: {
                        fada_clasicas: 0,
                        fada_rapidas: 0,
                        fada_blitz: 0,
                        fide_clasicas: 0,
                        fide_rapidas: 0,
                        fide_blitz: 0,
                        online_clasicas: 0,
                        online_rapidas: 0,
                        online_blitz: 0,
                    }
                });

                const jugador = await tx.jugador.create({
                    data: {
                        usuario_id: usuario.id,
                        elo_id: elo.id,
                        fecha_nacimiento: new Date(input.fechaNacimiento),
                        NIF: input.NIF,
                        licencia_numero: input.numLicencia?.toString(),
                    }
                });

                return { usuario, jugador, elo };
            });
            const token = jwt.sign(
                {
                    id: newUser.usuario.id,
                    email: newUser.usuario.email,
                    rol: newUser.usuario.rol,
                    nombre_completo: newUser.usuario.nombre_completo,
                },
                process.env.JWT_SECRET as string,
                { expiresIn: "7d" }
            );

            return { mToken: token };

        },
        registerDelegado: async (_: unknown, { input }: { input: RegisterDelegadoInput }, _context: Context) => {
            const existingUser = await prisma.usuario.findFirst({
                where: { email: input.email }
            });
            if (existingUser) {
                throw new Error("Ya existe un usuario con ese email");
            }

            const hashedPassword = await bcrypt.hash(input.password, 10);

            const newUser = await prisma.usuario.create({
                data: { email: input.email, password: hashedPassword, nombre_completo: input.nombre, rol: "delegado" }
            });

            const token = jwt.sign(
                {
                    id: newUser.id,
                    email: newUser.email,
                    rol: newUser.rol,
                    nombre_completo: newUser.nombre_completo,
                },
                process.env.JWT_SECRET as string,
                { expiresIn: "7d" }
            );

            return { mToken: token };
        }
    },
};