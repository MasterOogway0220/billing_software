import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { InvoiceForm } from "../../../../../components/invoice/InvoiceForm";
import type { CreateInvoiceInput } from "../../../../../schemas/invoice.schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit Invoice" };

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const businessId = session!.user.businessId!;

  const [invoice, clients, numberConfig] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, businessId },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.party.findMany({
      where: { businessId, type: { in: ["CLIENT", "BOTH"] }, isActive: true },
      select: { id: true, displayName: true, gstin: true, billingState: true, billingStateCode: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.invoiceNumberConfig.findFirst({ where: { businessId } }),
  ]);

  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/invoices/${id}`);

  const initialValues: Partial<CreateInvoiceInput> = {
    documentType: invoice.documentType as CreateInvoiceInput["documentType"],
    clientId: invoice.clientId ?? undefined,
    invoiceDate: invoice.invoiceDate.toISOString().split("T")[0],
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString().split("T")[0] : undefined,
    currency: invoice.currency,
    fxRate: Number(invoice.fxRate),
    supplyType: invoice.supplyType as CreateInvoiceInput["supplyType"],
    placeOfSupply: invoice.placeOfSupply ?? undefined,
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
    applyRoundOff: false,
    lineItems: invoice.lineItems.map((li, idx) => ({
      itemName: li.itemName,
      description: li.description ?? undefined,
      hsnSacCode: li.hsnSacCode ?? undefined,
      unit: li.unit,
      quantity: Number(li.quantity),
      rate: Number(li.rate),
      discountType: li.discountType as "PERCENT" | "FLAT",
      discountValue: Number(li.discountValue),
      taxRate: Number(li.taxRate),
      sortOrder: idx,
    })),
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Invoice</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Editing draft invoice <span className="font-medium">{invoice.invoiceNumber}</span>
        </p>
      </div>
      <InvoiceForm
        clients={clients}
        numberConfig={numberConfig}
        invoiceId={id}
        lockedInvoiceNumber={invoice.invoiceNumber}
        initialValues={initialValues}
      />
    </div>
  );
}
