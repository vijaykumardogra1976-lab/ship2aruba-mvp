import { api } from "@/lib/axios";
import type {
  OrderItemRow,
  OrderListItem,
  OrderPaymentsResponse,
  OrdersFilterParams,
  OrderStatusField,
  PaginatedOrders,
  PaymentRow,
} from "../types";

export async function listOrders(params: OrdersFilterParams = {}) {
  const { data } = await api.get<PaginatedOrders>("/orders/", {
    params: {
      customer: params.customer || undefined,
      search: params.search || undefined,
      search_items: params.search_items || undefined,
      page: params.page || undefined,
      page_size: params.page_size || undefined,
    },
  });
  return data;
}

export async function listAllOrders(
  params: Omit<OrdersFilterParams, "page" | "page_size"> = {},
) {
  const pageSize = 100;
  let page = 1;
  let allResults: PaginatedOrders["results"] = [];
  let count = 0;

  while (true) {
    const data = await listOrders({ ...params, page, page_size: pageSize });
    allResults = allResults.concat(data.results);
    count = data.count;
    if (!data.next) break;
    page += 1;
  }

  return { count, results: allResults };
}

export async function updateOrderStatus(
  orderId: number,
  payload: Partial<Record<OrderStatusField, boolean>>,
) {
  const { data } = await api.patch<OrderListItem>(
    `/orders/${orderId}/status/`,
    payload,
  );
  return data;
}

export async function getOrderItems(orderId: number) {
  const { data } = await api.get<OrderItemRow[]>(`/orders/${orderId}/items/`);
  return data;
}

export async function getOrderPayments(orderId: number) {
  const { data } = await api.get<OrderPaymentsResponse>(
    `/orders/${orderId}/payments/`,
  );
  return data;
}

export interface EditOrderPayload {
  items_total?: string;
  amount_usd?: string;
  order_date?: string;
  authorization_password: string;
}

export interface AddPaymentPayload {
  payment_date: string;
  amount: string;
  payment_method: string;
}

export interface AddPaymentResponse {
  payment: PaymentRow;
  paid_amount: string;
  remaining_balance: string;
}

export async function editOrder(orderId: number, payload: EditOrderPayload) {
  const { data } = await api.patch<OrderListItem>(
    `/orders/${orderId}/edit/`,
    payload,
  );
  return data;
}

export async function deleteOrder(orderId: number) {
  await api.delete(`/orders/${orderId}/`);
}

export async function updateOrderNotes(
  orderId: number,
  payload: { internal_notes?: string; client_notes?: string }
) {
  const { data } = await api.patch<OrderListItem>(
    `/orders/${orderId}/notes/`,
    payload
  );
  return data;
}

export async function uploadOrderPdf(orderId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<{ id: number; file_url: string }>(
    `/orders/${orderId}/upload-pdf/`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function deleteOrderPdf(orderId: number) {
  const { data } = await api.delete(`/orders/${orderId}/upload-pdf/`);
  return data;
}

export async function addOrderPayment(
  orderId: number,
  payload: AddPaymentPayload,
) {
  const { data } = await api.post<AddPaymentResponse>(
    `/orders/${orderId}/payments/`,
    payload,
  );
  return data;
}

export async function createOrderItem(orderId: number, payload: any) {
  const { data } = await api.post<OrderItemRow>(`/orders/${orderId}/items/`, payload);
  return data;
}

export async function updateOrderItem(itemId: number, payload: any) {
  const { data } = await api.patch<OrderItemRow>(`/orders/items/${itemId}/`, payload);
  return data;
}

export async function deleteOrderItem(itemId: number) {
  await api.delete(`/orders/items/${itemId}/`);
}

