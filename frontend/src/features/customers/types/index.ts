export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  created_at?: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  email?: string;
}
