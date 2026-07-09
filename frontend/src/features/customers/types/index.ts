export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  created_at?: string;
  orders_count?: number;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  email?: string;
}
