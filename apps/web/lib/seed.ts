import { prisma } from "./prisma";
import type { DocumentType } from "@repo/db";

const DEFAULT_TAX_RATES = [
  { name: "GST 0%", rate: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { name: "GST 5%", rate: 5, cgst: 2.5, sgst: 2.5, igst: 5, cess: 0 },
  { name: "GST 12%", rate: 12, cgst: 6, sgst: 6, igst: 12, cess: 0 },
  { name: "GST 18%", rate: 18, cgst: 9, sgst: 9, igst: 18, cess: 0, isDefault: true },
  { name: "GST 28%", rate: 28, cgst: 14, sgst: 14, igst: 28, cess: 0 },
];

const DEFAULT_ACCOUNTS = [
  { code: "1001", name: "Cash", group: "ASSETS" as const, subGroup: "Current Assets", isSystem: true },
  { code: "1002", name: "Bank", group: "ASSETS" as const, subGroup: "Current Assets", isSystem: true },
  { code: "1100", name: "Accounts Receivable", group: "ASSETS" as const, subGroup: "Current Assets", isSystem: true },
  { code: "1300", name: "TDS Receivable", group: "ASSETS" as const, subGroup: "Current Assets", isSystem: true },
  { code: "2001", name: "Accounts Payable", group: "LIABILITIES" as const, subGroup: "Current Liabilities", isSystem: true },
  { code: "2101", name: "CGST Payable", group: "LIABILITIES" as const, subGroup: "Current Liabilities", isSystem: true },
  { code: "2102", name: "SGST Payable", group: "LIABILITIES" as const, subGroup: "Current Liabilities", isSystem: true },
  { code: "2103", name: "IGST Payable", group: "LIABILITIES" as const, subGroup: "Current Liabilities", isSystem: true },
  { code: "2200", name: "TDS Payable", group: "LIABILITIES" as const, subGroup: "Current Liabilities", isSystem: true },
  { code: "4001", name: "Sales Revenue", group: "INCOME" as const, subGroup: "Operating Income", isSystem: true },
  { code: "4002", name: "Service Income", group: "INCOME" as const, subGroup: "Operating Income", isSystem: true },
  { code: "5001", name: "Cost of Goods Sold", group: "EXPENSES" as const, subGroup: "Direct Expenses", isSystem: true },
  { code: "5100", name: "Salary & Wages", group: "EXPENSES" as const, subGroup: "Operating Expenses", isSystem: true },
  { code: "3001", name: "Owner's Capital", group: "EQUITY" as const, subGroup: "Capital", isSystem: true },
  { code: "3002", name: "Retained Earnings", group: "EQUITY" as const, subGroup: "Capital", isSystem: true },
];

const DOC_TYPES: DocumentType[] = [
  "TAX_INVOICE", "PROFORMA", "QUOTATION", "CREDIT_NOTE", "DEBIT_NOTE",
  "PURCHASE_ORDER", "DELIVERY_CHALLAN", "PAYMENT_RECEIPT",
];

const PREFIX_MAP: Partial<Record<DocumentType, string>> = {
  TAX_INVOICE: "INV",
  CREDIT_NOTE: "CN",
  DEBIT_NOTE: "DN",
  QUOTATION: "QT",
  PROFORMA: "PRO",
  PURCHASE_ORDER: "PO",
  DELIVERY_CHALLAN: "DC",
  PAYMENT_RECEIPT: "REC",
};

export async function seedBusiness(businessId: string) {
  await prisma.taxRate.createMany({
    data: DEFAULT_TAX_RATES.map((t) => ({
      businessId,
      name: t.name,
      rate: t.rate,
      cgst: t.cgst,
      sgst: t.sgst,
      igst: t.igst,
      cess: t.cess,
      isDefault: (t as { isDefault?: boolean }).isDefault ?? false,
    })),
    skipDuplicates: true,
  });

  await prisma.ledgerAccount.createMany({
    data: DEFAULT_ACCOUNTS.map((a) => ({ ...a, businessId })),
    skipDuplicates: true,
  });

  await prisma.invoiceNumberConfig.createMany({
    data: DOC_TYPES.map((docType) => ({
      businessId,
      documentType: docType,
      prefix: PREFIX_MAP[docType] ?? docType.slice(0, 3),
      separator: "-",
      includeFY: true,
      fyFormat: "YYYY-YY",
      includeMonth: false,
      paddingDigits: 4,
      startingNumber: 1,
      currentCounter: 0,
      resetFrequency: "FINANCIAL_YEAR" as const,
    })),
    skipDuplicates: true,
  });
}
