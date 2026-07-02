import { z } from "zod";

export const CUSTOMER_NAME_MAX_LENGTH = 20;

export const createCustomerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(CUSTOMER_NAME_MAX_LENGTH, `Name must be ${CUSTOMER_NAME_MAX_LENGTH} characters or less`),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export type CreateCustomerFormValues = z.infer<typeof createCustomerSchema>;
