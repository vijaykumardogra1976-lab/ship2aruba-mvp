export interface ClientOrderProgress {
  order_received: boolean;
  payment_confirmed: boolean;
  purchased: boolean;
  arrived_warehouse: boolean;
  packing: boolean;
  shipped: boolean;
  customs: boolean;
  out_for_delivery: boolean;
  delivered: boolean;
}

export interface ClientOrderPayment {
  id: number;
  amount: string;
  method: string;
  paid_at: string;
  sequence: number;
}

export interface ClientOrder {
  id: number;
  order_number: string;
  order_date: string;
  created_at: string;
  website: string;
  website_type: "amazon" | "ebay" | "other";
  number_of_items: number;
  amount_usd: string;
  items_total: string;
  paid_amount: string;
  remaining_balance: string;
  payment_method: string;
  is_urgent: boolean;
  client_notes: string;
  current_status: string;
  status_label: string;
  status_color: "yellow" | "blue" | "violet" | "orange" | "green" | "red" | "gray";
  progress: ClientOrderProgress;
  invoice_number: string | null;
  invoice_detail?: {
    invoice_number: string;
    issued_at: string;
    subtotal: string;
    total: string;
    paid: string;
    remaining_balance: string;
    payment_method: string;
  };
  payments?: ClientOrderPayment[];
  items?: ClientOrderItem[];
}

export interface ClientOrderItem {
  id: number;
  label: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  tracking_number: string;
  fedex_tracking_number: string;
  image_url: string;
}


export interface PaginatedClientOrders {
  count: number;
  next: string | null;
  previous: string | null;
  results: ClientOrder[];
}

export interface DashboardStats {
  active: number;
  in_transit: number;
  delivered: number;
  pending_payment: number;
}

export interface MonthlyOrderData {
  month: string;
  orders: number;
}

export interface DashboardData {
  stats: DashboardStats;
  monthly_orders: MonthlyOrderData[];
  recent_orders: ClientOrder[];
  payment_due: string;
}

export interface PaymentHistoryItem {
  id: number;
  order_id: number;
  order_number: string;
  amount: string;
  method: string;
  paid_at: string;
}

export interface PendingPaymentOrder {
  id: number;
  order_number: string;
  items_total: string;
  paid_amount: string;
  remaining_balance: string;
  current_status: string;
  status_label: string;
}

export interface PaymentsData {
  outstanding: string;
  pending_orders: PendingPaymentOrder[];
  history: PaymentHistoryItem[];
}
