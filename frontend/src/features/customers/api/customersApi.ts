import { api } from "@/lib/axios";
import type { CreateCustomerPayload, Customer } from "../types";

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function searchCustomers(search: string) {
  const { data } = await api.get<PaginatedResponse<Customer> | Customer[]>(
    "/customers/",
    { params: { search } },
  );
  if (Array.isArray(data)) return data;
  return data.results;
}

export async function listCustomers() {
  const { data } = await api.get<PaginatedResponse<Customer>>("/customers/", {
    params: { page_size: 100 },
  });
  return data.results;
}

export async function createCustomer(payload: CreateCustomerPayload) {
  const { data } = await api.post<Customer>("/customers/", payload);
  return data;
}
