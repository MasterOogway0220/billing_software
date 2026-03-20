import { prisma } from "./prisma";
import { getFinancialYear } from "./utils";
import type { DocumentType } from "@repo/db";

interface NumberConfig {
  prefix?: string | null;
  includeFY: boolean;
  fyFormat?: string | null;
  includeMonth: boolean;
  monthFormat: "SHORT" | "NUMERIC";
  separator: string;
  paddingDigits: number;
  currentCounter: number;
  startingNumber: number;
  suffix?: string | null;
  resetFrequency: "NEVER" | "FINANCIAL_YEAR" | "CALENDAR_YEAR" | "MONTHLY";
  lastResetDate?: Date | null;
}

const MONTH_SHORT = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export function previewInvoiceNumber(config: NumberConfig, date: Date = new Date()): string {
  const counter = config.currentCounter + 1;
  return buildNumber(config, date, counter);
}

function buildNumber(config: NumberConfig, date: Date, counter: number): string {
  const parts: string[] = [];
  const sep = config.separator || "-";

  if (config.prefix) parts.push(config.prefix);
  if (config.includeFY) parts.push(formatFY(date, config.fyFormat));
  if (config.includeMonth) {
    parts.push(
      config.monthFormat === "SHORT"
        ? MONTH_SHORT[date.getMonth()] ?? ""
        : String(date.getMonth() + 1).padStart(2, "0")
    );
  }
  parts.push(String(counter).padStart(config.paddingDigits, "0"));
  if (config.suffix) parts.push(config.suffix);

  return parts.join(sep);
}

function formatFY(date: Date, format?: string | null): string {
  // "YYYY-YY" → "2526", "YY-YY" → "25-26"
  const fy = getFinancialYear(date);
  if (!format || format === "YYYY-YY") return fy;
  return fy; // extend for other formats as needed
}

export async function generateInvoiceNumber(
  businessId: string,
  documentType: DocumentType,
  date: Date = new Date()
): Promise<string> {
  // Use a transaction to safely increment counter
  return await prisma.$transaction(async (tx) => {
    const config = await tx.invoiceNumberConfig.findUnique({
      where: { businessId_documentType: { businessId, documentType } },
    });

    if (!config) throw new Error(`No number config found for ${documentType}`);

    // Check if reset is needed
    let counter = config.currentCounter;
    let lastReset = config.lastResetDate;
    const needsReset = checkNeedsReset(config.resetFrequency, config.lastResetDate, date);

    if (needsReset) {
      counter = 0;
      lastReset = date;
    }

    const nextCounter = counter + 1;
    const number = buildNumber(
      {
        prefix: config.prefix,
        includeFY: config.includeFY,
        fyFormat: config.fyFormat,
        includeMonth: config.includeMonth,
        monthFormat: config.monthFormat,
        separator: config.separator,
        paddingDigits: config.paddingDigits,
        currentCounter: counter,
        startingNumber: config.startingNumber,
        suffix: config.suffix,
        resetFrequency: config.resetFrequency,
        lastResetDate: lastReset,
      },
      date,
      Math.max(nextCounter, config.startingNumber)
    );

    await tx.invoiceNumberConfig.update({
      where: { id: config.id },
      data: { currentCounter: nextCounter, lastResetDate: lastReset },
    });

    return number;
  });
}

function checkNeedsReset(
  freq: string,
  lastReset: Date | null,
  now: Date
): boolean {
  if (freq === "NEVER" || !lastReset) return false;
  if (freq === "MONTHLY") {
    return now.getFullYear() !== lastReset.getFullYear() || now.getMonth() !== lastReset.getMonth();
  }
  if (freq === "CALENDAR_YEAR") {
    return now.getFullYear() !== lastReset.getFullYear();
  }
  if (freq === "FINANCIAL_YEAR") {
    const lastFY = getFinancialYear(lastReset);
    const nowFY = getFinancialYear(now);
    return lastFY !== nowFY;
  }
  return false;
}
