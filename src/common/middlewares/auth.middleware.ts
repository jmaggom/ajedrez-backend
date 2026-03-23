import jwt from "jsonwebtoken";
import { Request } from "express";
import { JwtUser } from "../context.types";

const authMiddleware = async (req: Request): Promise<JwtUser | null> => {
    const token = req.headers.authorization?.replace("JWT ", "").trim();
    if (!token)
        return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    if (!decoded || typeof decoded === "string")
        return null;

    return decoded as JwtUser;
}

export default authMiddleware;
