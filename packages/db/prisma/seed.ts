import { PrismaClient, DocumentType } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_TAX_RATES = [
  { name: "GST 0%", rate: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 },
  { name: "GST 5%", rate: 5, cgst: 2.5, sgst: 2.5, igst: 5, cess: 0 },
  { name: "GST 12%", rate: 12, cgst: 6, sgst: 6, igst: 12, cess: 0 },
  { name: "GST 18%", rate: 18, cgst: 9, sgst: 9, igst: 18, cess: 0, isDefault: true },
  { name: "GST 28%", rate: 28, cgst: 14, sgst: 14, igst: 28, cess: 0 },
];

const DEFAULT_CHART_OF_ACCOUNTS = [
  // Assets
  { code: "1001", name: "Cash", group: "ASSETS", subGroup: "Current Assets", isSystem: true },
  { code: "1002", name: "Bank", group: "ASSETS", subGroup: "Current Assets", isSystem: true },
  { code: "1100", name: "Accounts Receivable", group: "ASSETS", subGroup: "Current Assets", isSystem: true },
  { code: "1200", name: "Inventory", group: "ASSETS", subGroup: "Current Assets", isSystem: true },
  { code: "1300", name: "TDS Receivable", group: "ASSETS", subGroup: "Current Assets", isSystem: true },
  { code: "1500", name: "Fixed Assets", group: "ASSETS", subGroup: "Fixed Assets", isSystem: true },
  // Liabilities
  { code: "2001", name: "Accounts Payable", group: "LIABILITIES", subGroup: "Current Liabilities", isSystem: true },
  { code: "2100", name: "GST Payable", group: "LIABILITIES", subGroup: "Current Liabilities", isSystem: true },
  { code: "2101", name: "CGST Payable", group: "LIABILITIES", subGroup: "Current Liabilities", isSystem: true },
  { code: "2102", name: "SGST Payable", group: "LIABILITIES", subGroup: "Current Liabilities", isSystem: true },
  { code: "2103", name: "IGST Payable", group: "LIABILITIES", subGroup: "Current Liabilities", isSystem: true },
  { code: "2200", name: "TDS Payable", group: "LIABILITIES", subGroup: "Current Liabilities", isSystem: true },
  // Income
  { code: "4001", name: "Sales Revenue", group: "INCOME", subGroup: "Operating Income", isSystem: true },
  { code: "4002", name: "Service Income", group: "INCOME", subGroup: "Operating Income", isSystem: true },
  { code: "4003", name: "Other Income", group: "INCOME", subGroup: "Other Income", isSystem: true },
  // Expenses
  { code: "5001", name: "Cost of Goods Sold", group: "EXPENSES", subGroup: "Direct Expenses", isSystem: true },
  { code: "5100", name: "Salary & Wages", group: "EXPENSES", subGroup: "Operating Expenses", isSystem: true },
  { code: "5101", name: "Rent", group: "EXPENSES", subGroup: "Operating Expenses", isSystem: true },
  { code: "5102", name: "Utilities", group: "EXPENSES", subGroup: "Operating Expenses", isSystem: true },
  { code: "5103", name: "Travel & Conveyance", group: "EXPENSES", subGroup: "Operating Expenses", isSystem: true },
  { code: "5104", name: "Professional Fees", group: "EXPENSES", subGroup: "Operating Expenses", isSystem: true },
  { code: "5200", name: "Bank Charges", group: "EXPENSES", subGroup: "Financial Expenses", isSystem: true },
  { code: "5201", name: "Depreciation", group: "EXPENSES", subGroup: "Financial Expenses", isSystem: true },
  // Equity
  { code: "3001", name: "Owner's Capital", group: "EQUITY", subGroup: "Capital", isSystem: true },
  { code: "3002", name: "Retained Earnings", group: "EQUITY", subGroup: "Capital", isSystem: true },
];

const DEFAULT_NUMBER_CONFIGS = Object.values(DocumentType).map((docType) => ({
  documentType: docType,
  prefix: docType === "TAX_INVOICE" ? "INV" : docType === "CREDIT_NOTE" ? "CN" : docType === "QUOTATION" ? "QT" : docType.slice(0, 3),
  separator: "-",
  includeFY: true,
  fyFormat: "YYYY-YY",
  paddingDigits: 4,
  startingNumber: 1,
  currentCounter: 0,
  resetFrequency: "FINANCIAL_YEAR" as const,
}));

export async function seedBusiness(businessId: string) {
  // Seed tax rates
  await prisma.taxRate.createMany({
    data: DEFAULT_TAX_RATES.map((t) => ({
      ...t,
      rate: t.rate,
      cgst: t.cgst,
      sgst: t.sgst,
      igst: t.igst,
      cess: t.cess,
      isDefault: (t as { isDefault?: boolean }).isDefault ?? false,
      businessId,
    })),
    skipDuplicates: true,
  });

  // Seed chart of accounts
  await prisma.ledgerAccount.createMany({
    data: DEFAULT_CHART_OF_ACCOUNTS.map((a) => ({
      ...a,
      group: a.group as "ASSETS" | "LIABILITIES" | "INCOME" | "EXPENSES" | "EQUITY",
      businessId,
    })),
    skipDuplicates: true,
  });

  // Seed invoice number configs
  await prisma.invoiceNumberConfig.createMany({
    data: DEFAULT_NUMBER_CONFIGS.map((c) => ({
      ...c,
      businessId,
    })),
    skipDuplicates: true,
  });
}

async function main() {
  console.log("Seed script: use seedBusiness(businessId) from within the app.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
