import { api } from "@/lib/axios";
import type { CreateOrderPayload, InvoiceData, OrderResponse } from "../types";

export async function createOrder(payload: CreateOrderPayload) {
  const { data } = await api.post<OrderResponse>("/orders/", payload);
  return data;
}

export async function getInvoice(id: number) {
  const { data } = await api.get<InvoiceData>(`/invoices/${id}/`);
  return data;
}

export async function getOrderInvoice(orderId: number) {
  const { data } = await api.get<InvoiceData>(`/orders/${orderId}/invoice/`);
  return data;
}

export async function uploadOrderPdf(orderId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(`/orders/${orderId}/upload-pdf/?background=true`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}
