import { Usuario } from "@prisma/client";

export type Context = {
    user: Usuario | null;
}