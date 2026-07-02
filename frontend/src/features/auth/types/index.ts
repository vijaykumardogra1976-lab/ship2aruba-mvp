export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "staff" | "customer";
  full_name: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}
