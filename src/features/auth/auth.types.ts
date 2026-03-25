export type EmailLoginInput = {
    email: string;
    otp: string;
};

export type RegisterPlayerInput = {
    name: string;
    email: string;
    password: string;
    birthDate: string;
    NIF: string;
    fideId?: string;
};

export type RegisterDelegateInput = {
    name: string;
    email: string;
    password: string;
};
