export interface ClientOTPRequestPayload {
  identifier: string; // email or phone
}

export interface ClientOTPRequestResponse {
  detail: string;
  identifier_type: "email" | "phone";
  masked_identifier: string;
}

export interface ClientOTPVerifyPayload {
  identifier: string;
  code: string;
}

export interface ClientOTPVerifyResponse {
  access: string;
  refresh: string;
  is_first_login: boolean;
  customer_name: string;
  customer_id: number;
}

export interface ClientSetPasswordPayload {
  password: string;
  confirm_password: string;
}

export interface ClientUser {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: "customer";
}
