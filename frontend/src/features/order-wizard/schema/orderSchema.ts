import { z } from "zod";

const positiveNumber = z.coerce.number().positive();

export const step1Schema = z.object({
  customer: z.object({
    id: z.number(),
    name: z.string(),
    phone: z.string(),
    email: z.string().nullable(),
  }),
});

export const step2Schema = z.object({
  website_type: z.enum(["amazon", "ebay", "other"] as const, { message: "Please select a website to continue" }),
  website: z.string().min(1, "Order website is required"),
  order_date: z.string().min(1, "Order date is required"),
  number_of_items: positiveNumber.refine((v) => v > 0, "Items must be greater than 0"),
  amount_usd: positiveNumber.refine((v) => v > 0, "Amount must be greater than 0"),
});

export const step3Schema = z.object({
  payment_type: z.enum(["one", "two"] as const, { message: "Please select a payment type to continue" }),
  payment_amount: z.coerce.number().min(0),
  items_total: positiveNumber,
  paid_amount: z.coerce.number().min(0),
  payment_method: z.enum(["cash", "pin", "transfer"] as const),
});

export const step4Schema = z.object({
  is_new_client: z.boolean(),
  is_urgent: z.boolean(),
  internal_notes: z.string(),
  client_notes: z.string(),
});

export const orderSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .refine((data) => data.paid_amount <= data.items_total, {
    message: "Paid amount cannot exceed items total",
    path: ["paid_amount"],
  });

export type OrderFormValues = z.infer<typeof orderSchema>;

export const STEP_FIELDS: Record<number, (keyof OrderFormValues)[]> = {
  1: ["customer"],
  2: ["website_type", "website", "order_date", "number_of_items", "amount_usd"],
  3: ["payment_type", "payment_amount", "items_total", "paid_amount", "payment_method"],
  4: ["is_new_client", "is_urgent", "internal_notes", "client_notes"],
};
