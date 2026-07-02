export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  customers: {
    search: (q: string) => ["customers", "search", q] as const,
    list: ["customers", "list"] as const,
  },
  orders: {
    list: (filters: Record<string, unknown>) => ["orders", "list", filters] as const,
    detail: (id: number) => ["orders", id] as const,
    items: (id: number) => ["orders", id, "items"] as const,
    payments: (id: number) => ["orders", id, "payments"] as const,
  },
  invoices: {
    detail: (id: number) => ["invoices", id] as const,
  },
};
