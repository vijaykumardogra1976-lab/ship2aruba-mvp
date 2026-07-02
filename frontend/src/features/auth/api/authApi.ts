import { api } from "@/lib/axios";
import type { LoginResponse } from "../types";

export async function login(email: string, password: string) {
  const { data } = await api.post<LoginResponse>("/auth/login/", { email, password });
  return data;
}

export async function logout(refresh: string) {
  await api.post("/auth/logout/", { refresh });
}

export async function getMe() {
  const { data } = await api.get("/auth/me/");
  return data;
}

export async function changePassword(payload: any) {
  const { data } = await api.post("/auth/change-password/", payload);
  return data;
}

export async function updateMe(payload: { email?: string; full_name?: string }) {
  const { data } = await api.patch("/auth/me/", payload);
  return data;
}
