export interface ClientSignupPayload {
  name: string;
  phone?: string;
  email?: string;
  password?: string;
}

export interface ClientLoginPayload {
  identifier: string; // email or phone
  password?: string;
}

export interface ClientAuthResponse {
  access: string;
  refresh: string;
  user?: ClientUser;
}

export interface ClientUser {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: "customer";
}
