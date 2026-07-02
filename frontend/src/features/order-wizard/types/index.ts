import type { Customer } from "@/features/customers/types";

export type WebsiteType = "amazon" | "ebay" | "other";
export type PaymentType = "one" | "two";
export type PaymentMethod = "cash" | "pin" | "transfer";

export interface OrderFormData {
  customer: Customer | null;
  new_customer_name?: string;
  new_customer_phone?: string;
  new_customer_email?: string;
  new_customer_phone_code?: string;
  website_type: WebsiteType | "";
  website: string;
  order_date: string;
  number_of_items: number | "";
  amount_usd: number | "";
  payment_type: PaymentType | "";
  payment_amount: number | "";
  items_total: number | "";
  paid_amount: number | "";
  payment_method: PaymentMethod | "";
  is_new_client: boolean;
  is_urgent: boolean;
  internal_notes: string;
  client_notes: string;
}

export interface CreateOrderPayload {
  customer_id: number;
  website_type: WebsiteType;
  website: string;
  order_date: string;
  number_of_items: number;
  amount_usd: number;
  payment_type: PaymentType;
  payment_amount: number;
  items_total: number;
  paid_amount: number;
  payment_method: PaymentMethod;
  is_new_client: boolean;
  is_urgent: boolean;
  internal_notes: string;
  client_notes: string;
}

export interface OrderResponse {
  id: number;
  order_number: string;
  customer: Customer;
  website_type: WebsiteType;
  website: string;
  order_date: string;
  number_of_items: number;
  amount_usd: string;
  payment_type: PaymentType;
  payment_amount: string;
  items_total: string;
  paid_amount: string;
  remaining_balance: string;
  payment_method: PaymentMethod;
  is_new_client: boolean;
  is_urgent: boolean;
  internal_notes: string;
  client_notes: string;
  current_status: string;
  invoice: { id: number; invoice_number: string };
  created_at: string;
}

export interface InvoiceData {
  invoice_number: string;
  order_number: string;
  issued_at: string;
  amount_due: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  number_of_items: number;
  items_total: string;
  subtotal: string;
  total: string;
  paid: string;
  remaining_balance: string;
  payment_method: string;
  payment_amount: string;
  line_items: Array<{
    label: string;
    quantity: number;
    price: string;
    amount: string;
  }>;
  company: {
    name: string;
    address: string;
    phone: string;
  };
}
