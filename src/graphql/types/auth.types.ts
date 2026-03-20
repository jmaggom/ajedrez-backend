export type EmailLoginInput = {
    email: string;
    password: string;
};

export type RegisterJugadorInput = {
    nombre: string;
    email: string;
    password: string;
    fechaNacimiento: string;
    NIF: string;
    numLicencia?: string;
};

export type RegisterDelegadoInput = {
    nombre: string;
    email: string;
    password: string;
};