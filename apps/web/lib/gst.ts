export interface LineItemInput {
  quantity: number;
  rate: number;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  taxRate: number;
  supplyType: "INTRA_STATE" | "INTER_STATE" | "EXPORT";
}

export interface LineItemCalc {
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  lineTotal: number;
}

export function calculateLineItem(item: LineItemInput, cessRate = 0): LineItemCalc {
  const gross = item.quantity * item.rate;
  const discountAmount =
    item.discountType === "PERCENT"
      ? (gross * item.discountValue) / 100
      : item.discountValue;
  const taxable = Math.max(0, gross - discountAmount);

  let cgstRate = 0, sgstRate = 0, igstRate = 0;

  if (item.supplyType === "INTRA_STATE") {
    cgstRate = item.taxRate / 2;
    sgstRate = item.taxRate / 2;
  } else if (item.supplyType === "INTER_STATE" || item.supplyType === "EXPORT") {
    igstRate = item.taxRate;
  }

  const cgstAmount = round2(taxable * cgstRate / 100);
  const sgstAmount = round2(taxable * sgstRate / 100);
  const igstAmount = round2(taxable * igstRate / 100);
  const cessAmount = round2(taxable * cessRate / 100);
  const lineTotal = round2(taxable + cgstAmount + sgstAmount + igstAmount + cessAmount);

  return {
    grossAmount: round2(gross),
    discountAmount: round2(discountAmount),
    taxableAmount: round2(taxable),
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cessAmount,
    lineTotal,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalCess: number;
  roundOff: number;
  grandTotal: number;
}

export function calculateInvoiceTotals(
  lineItems: LineItemCalc[],
  applyRoundOff = false
): InvoiceTotals {
  const subtotal = round2(lineItems.reduce((s, i) => s + i.grossAmount, 0));
  const totalDiscount = round2(lineItems.reduce((s, i) => s + i.discountAmount, 0));
  const totalTaxable = round2(lineItems.reduce((s, i) => s + i.taxableAmount, 0));
  const totalCGST = round2(lineItems.reduce((s, i) => s + i.cgstAmount, 0));
  const totalSGST = round2(lineItems.reduce((s, i) => s + i.sgstAmount, 0));
  const totalIGST = round2(lineItems.reduce((s, i) => s + i.igstAmount, 0));
  const totalCess = round2(lineItems.reduce((s, i) => s + i.cessAmount, 0));
  const rawTotal = round2(totalTaxable + totalCGST + totalSGST + totalIGST + totalCess);
  const roundOff = applyRoundOff ? round2(Math.round(rawTotal) - rawTotal) : 0;
  const grandTotal = round2(rawTotal + roundOff);

  return { subtotal, totalDiscount, totalTaxable, totalCGST, totalSGST, totalIGST, totalCess, roundOff, grandTotal };
}
