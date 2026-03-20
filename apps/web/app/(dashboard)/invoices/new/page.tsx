import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { InvoiceForm } from "../../../../components/invoice/InvoiceForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Invoice" };

export default async function NewInvoicePage() {
  const session = await auth();
  const [clients, numberConfig] = await Promise.all([
    prisma.party.findMany({
      where: { businessId: session!.user.businessId!, type: { in: ["CLIENT", "BOTH"] }, isActive: true },
      select: { id: true, displayName: true, gstin: true, billingState: true, billingStateCode: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.invoiceNumberConfig.findFirst({
      where: { businessId: session!.user.businessId!, documentType: "TAX_INVOICE" },
    }),
  ]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-5">Create Invoice</h2>
      <InvoiceForm clients={clients} numberConfig={numberConfig} />
    </div>
  );
}
