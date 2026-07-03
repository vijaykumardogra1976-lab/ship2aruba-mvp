export const WIZARD_STEPS = [
  { id: 1, title: "Customer", description: "Select or create customer" },
  { id: 2, title: "Order Info", description: "Date, items, website & amount" },
  { id: 3, title: "Payment", description: "Type, method & amount" },
  { id: 4, title: "Options & Notes", description: "Client, urgent & notes" },
  { id: 5, title: "Preview", description: "Review before submit" },
] as const;

export const WEBSITE_OPTIONS = [
  { type: "amazon" as const, label: "Amazon", website: "Amazon" },
  { type: "ebay" as const, label: "eBay", website: "eBay" },
  { type: "other" as const, label: "Other", website: "" },
];

export const PAYMENT_TYPE_OPTIONS = [
  { type: "one" as const, label: "One Payment" },
  { type: "two" as const, label: "Two Payments" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { type: "cash" as const, label: "Cash" },
  { type: "pin" as const, label: "PIN" },
  { type: "transfer" as const, label: "Transfer" },
];

export const WIZARD_STORAGE_KEY = "ship2aruba-order-wizard";
