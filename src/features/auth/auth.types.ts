export type EmailLoginInput = {
    email: string;
    password: string;
};

export type RegisterPlayerInput = {
    name: string;
    email: string;
    password: string;
    birthDate: string;
    NIF: string;
    licenseNumber?: string;
};

export type RegisterDelegateInput = {
    name: string;
    email: string;
    password: string;
};
