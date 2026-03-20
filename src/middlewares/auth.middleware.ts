import jwt from "jsonwebtoken";
import { Request } from "express";

const authMiddleware = async (req: Request) => {
    const token = req.headers.authorization?.replace("JWT ", "").trim();
    if (!token)
        return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    if (!decoded)
        return null;

    return decoded;
}

export default authMiddleware;