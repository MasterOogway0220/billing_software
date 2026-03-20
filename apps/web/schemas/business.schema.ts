import { z } from "zod";

export const businessProfileSchema = z.object({
  name: z.string().min(2),
  legalName: z.string().optional(),
  type: z.enum(["INDIVIDUAL", "PROPRIETORSHIP", "PARTNERSHIP", "LLP", "COMPANY"]),
  gstin: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
      { message: "Invalid GSTIN format" }
    ),
  pan: z
    .string()
    .optional()
    .refine((v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v), {
      message: "Invalid PAN format",
    }),
  logoUrl: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  financialYearStart: z
    .enum(["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"])
    .default("APRIL"),
  defaultCurrency: z.string().default("INR"),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: z.string().optional(),
  country: z.string().default("India"),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  upiId: z.string().optional(),
  invoiceFooter: z.string().optional(),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
