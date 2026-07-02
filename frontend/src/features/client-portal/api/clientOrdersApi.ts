import { api } from "@/lib/axios";
import type {
  ClientOrder,
  DashboardData,
  PaginatedClientOrders,
  PaymentsData,
} from "../types";

export async function fetchClientDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>("/client/dashboard/");
  return data;
}

export async function fetchClientOrders(params?: {
  page?: number;
  status?: string;
  website_type?: string;
  search?: string;
  ordering?: string;
}): Promise<PaginatedClientOrders> {
  const p = new URLSearchParams();
  if (params?.page) p.set("page", String(params.page));
  if (params?.status && params.status !== "all") p.set("status", params.status);
  if (params?.website_type) p.set("website_type", params.website_type);
  if (params?.search) p.set("search", params.search);
  if (params?.ordering) p.set("ordering", params.ordering);
  const { data } = await api.get<PaginatedClientOrders>(`/client/orders/?${p.toString()}`);
  return data;
}

export async function fetchClientOrderDetail(id: number): Promise<ClientOrder> {
  const { data } = await api.get<ClientOrder>(`/client/orders/${id}/`);
  return data;
}

export async function fetchClientPayments(): Promise<PaymentsData> {
  const { data } = await api.get<PaymentsData>("/client/payments/");
  return data;
}
