import type { Customer } from "@/features/customers/types";

export interface PlacedBy {
  id: number;
  full_name: string;
}

export interface OrderListItem {
  id: number;
  order_number: string;
  customer: Customer;
  order_date: string;
  amount_usd: string;
  items_total: string;
  paid_amount: string;
  remaining_balance: string;
  number_of_items: number;
  payment_amount: string;
  payment_type: string;
  payment_type_display: string;
  payment_method: string;
  payment_method_display: string;
  internal_notes: string;
  client_notes: string;
  is_az_ordered: boolean;
  is_uploaded: boolean;
  is_in_myus: boolean;
  is_completed: boolean;
  has_pdf: boolean;
  pdf_url: string | null;
  placed_by: PlacedBy | null;
  created_at: string;
}

export interface PaginatedOrders {
  count: number;
  next: string | null;
  previous: string | null;
  results: OrderListItem[];
}

export interface OrdersFilterParams {
  customer?: number;
  search?: string;
  search_items?: string;
  page?: number;
  page_size?: number;
}

export type OrderStatusField =
  | "is_az_ordered"
  | "is_uploaded"
  | "is_in_myus"
  | "is_completed";

export interface OrderItemRow {
  id: number;
  label: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  tracking_number: string;
  fedex_tracking_number: string;
  image_url: string;
  is_in_myus: boolean;
  is_ready_for_pickup: boolean;
  is_delivered: boolean;
  est_date: string | null;
  address: string;
  notes: string;
  account_used: string;
  created_at: string;
}

export interface PaymentRow {
  id: number;
  sequence: number;
  amount: string;
  payment_method: string;
  payment_method_display: string;
  payment_type: string;
  paid_at: string;
  recorded_by_name: string | null;
  created_at: string;
}

export interface OrderPaymentsResponse {
  customer_name: string;
  current_balance: string;
  items_total: string;
  paid_amount: string;
  payments: PaymentRow[];
  payment_history: {
    id: number;
    action: string;
    previous_paid_amount: string | null;
    new_paid_amount: string;
    change_amount: string;
    note: string;
    changed_by_name: string | null;
    created_at: string;
  }[];
}
