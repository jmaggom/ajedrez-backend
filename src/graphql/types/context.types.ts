export type Context = {
    user: User | null;
}

export type User = {
    id: string;
    email: string;
    name: string;
    role: string;
}