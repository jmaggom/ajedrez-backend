export type JwtUser = {
    id: number;
    email: string;
    role: string;
    fullName: string;
}

export type Context = {
    user: JwtUser | null;
}
