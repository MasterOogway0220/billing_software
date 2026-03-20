import { z } from "zod";

export const lineItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  hsnSacCode: z.string().optional(),
  unit: z.string().default("pcs"),
  quantity: z.number().positive("Quantity must be positive"),
  rate: z.number().min(0, "Rate cannot be negative"),
  discountType: z.enum(["PERCENT", "FLAT"]).default("PERCENT"),
  discountValue: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(18),
  sortOrder: z.number().int().default(0),
});

export const createInvoiceSchema = z.object({
  documentType: z
    .enum(["TAX_INVOICE", "PROFORMA", "QUOTATION", "CREDIT_NOTE", "DEBIT_NOTE",
           "PURCHASE_ORDER", "DELIVERY_CHALLAN", "PAYMENT_RECEIPT"])
    .default("TAX_INVOICE"),
  invoiceNumber: z.string().optional(), // optional — auto-generated if empty
  invoiceDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()).optional(),
  clientId: z.string().optional(),
  vendorId: z.string().optional(),
  currency: z.string().default("INR"),
  fxRate: z.number().positive().default(1),
  supplyType: z.enum(["INTRA_STATE", "INTER_STATE", "EXPORT"]).default("INTRA_STATE"),
  placeOfSupply: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  templateId: z.string().optional(),
  applyRoundOff: z.boolean().default(false),
  shippingAddress: z
    .object({
      addressLine1: z.string(),
      city: z.string(),
      state: z.string(),
      pincode: z.string(),
    })
    .optional(),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string(),
  paymentDate: z.string().or(z.date()),
  amount: z.number().positive("Amount must be positive"),
  mode: z
    .enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CREDIT_CARD", "DEBIT_CARD", "ONLINE"])
    .default("BANK_TRANSFER"),
  referenceNo: z.string().optional(),
  chequeNo: z.string().optional(),
  chequeDate: z.string().or(z.date()).optional(),
  tdsAmount: z.number().min(0).default(0),
  tdsSection: z.string().optional(),
  notes: z.string().optional(),
});

export type LineItemInput = z.infer<typeof lineItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
