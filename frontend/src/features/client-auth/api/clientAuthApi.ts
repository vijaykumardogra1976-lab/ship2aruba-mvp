import { api } from "@/lib/axios";
import type {
  ClientOTPRequestPayload,
  ClientOTPRequestResponse,
  ClientOTPVerifyPayload,
  ClientOTPVerifyResponse,
  ClientSetPasswordPayload,
  ClientUser,
} from "../types";

export async function requestClientOTP(
  payload: ClientOTPRequestPayload
): Promise<ClientOTPRequestResponse> {
  const { data } = await api.post<ClientOTPRequestResponse>(
    "/client/auth/otp/request/",
    payload
  );
  return data;
}

export async function verifyClientOTP(
  payload: ClientOTPVerifyPayload
): Promise<ClientOTPVerifyResponse> {
  const { data } = await api.post<ClientOTPVerifyResponse>(
    "/client/auth/otp/verify/",
    payload
  );
  return data;
}

export async function setClientPassword(
  payload: ClientSetPasswordPayload
): Promise<void> {
  await api.post("/client/auth/set-password/", payload);
}

export async function fetchClientMe(): Promise<ClientUser> {
  const { data } = await api.get<ClientUser>("/client/auth/me/");
  return data;
}

export async function clientRefreshToken(refresh: string): Promise<{ access: string }> {
  const { data } = await api.post<{ access: string }>("/auth/refresh/", { refresh });
  return data;
}
