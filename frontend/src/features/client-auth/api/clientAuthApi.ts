import { api } from "@/lib/axios";
import type {
  ClientSignupPayload,
  ClientLoginPayload,
  ClientAuthResponse,
  ClientUser,
} from "../types";

export async function clientSignup(
  payload: ClientSignupPayload
): Promise<ClientAuthResponse> {
  const { data } = await api.post<ClientAuthResponse>(
    "/client/auth/signup/",
    payload
  );
  return data;
}

export async function clientLogin(
  payload: ClientLoginPayload
): Promise<ClientAuthResponse> {
  const { data } = await api.post<ClientAuthResponse>(
    "/client/auth/login/",
    payload
  );
  return data;
}

export async function fetchClientMe(): Promise<ClientUser> {
  const { data } = await api.get<ClientUser>("/client/auth/me/");
  return data;
}

export async function clientRefreshToken(refresh: string): Promise<{ access: string }> {
  const { data } = await api.post<{ access: string }>("/auth/refresh/", { refresh });
  return data;
}
