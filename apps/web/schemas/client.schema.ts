import { z } from "zod";

export const partySchema = z.object({
  type: z.enum(["CLIENT", "VENDOR", "BOTH"]).default("CLIENT"),
  displayName: z.string().min(1, "Name is required"),
  legalName: z.string().optional(),
  gstin: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
      { message: "Invalid GSTIN" }
    ),
  pan: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  billingAddressLine1: z.string().optional(),
  billingAddressLine2: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingStateCode: z.string().optional(),
  billingPincode: z.string().optional(),
  billingCountry: z.string().default("India"),
  defaultPaymentTerms: z.number().int().min(0).default(30),
  defaultCurrency: z.string().default("INR"),
  notes: z.string().optional(),
});

export type PartyInput = z.infer<typeof partySchema>;
