import jwt from "jsonwebtoken";
import { Request } from "express";
import { Usuario } from "@prisma/client";

const authMiddleware = async (req: Request): Promise<Usuario | null> => {
    const token = req.headers.authorization?.replace("JWT ", "").trim();
    if (!token)
        return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    if (!decoded || typeof decoded === "string")
        return null;

    return decoded as Usuario;
}

export default authMiddleware;