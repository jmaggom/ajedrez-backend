import { StringValue } from "ms";

export const JWT_SECRET = process.env.JWT_SECRET as string;
export const JWT_EXPIRATION = "7d" as StringValue;
