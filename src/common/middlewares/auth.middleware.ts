import * as jwt from "jsonwebtoken";
import { Request } from "express";
import { JwtUser } from "../context.types";
import { prisma } from "../../config/database";

const authMiddleware = async (req: Request): Promise<JwtUser | null> => {
    const token = req.headers.authorization?.replace("JWT ", "").trim();
    if (!token)
        return null;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

        if (!decoded || typeof decoded === "string")
            return null;

        const user = decoded as JwtUser;

        // Verificar que existe una sesión activa para este usuario
        const session = await prisma.mobileSession.findFirst({
            where: { userId: user.id, isActive: true },
        });

        if (!session)
            return null;

        return user;
    } catch {
        return null;
    }
}

export default authMiddleware;
