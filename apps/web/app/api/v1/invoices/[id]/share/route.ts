import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { ok, err } from "../../../../../../lib/api";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId: session.user.businessId },
    select: { id: true, shareToken: true, status: true },
  });

  if (!invoice) {
    return NextResponse.json(err("NOT_FOUND", "Invoice not found"), { status: 404 });
  }

  if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
    return NextResponse.json(
      err("INVALID_STATUS", "Cannot share a voided or cancelled invoice"),
      { status: 400 }
    );
  }

  // shareToken is already set by default(cuid()), but ensure it exists
  let { shareToken } = invoice;
  if (!shareToken) {
    const updated = await prisma.invoice.update({
      where: { id },
      data: { shareToken: crypto.randomUUID().replace(/-/g, "") },
      select: { shareToken: true },
    });
    shareToken = updated.shareToken;
  }

  return NextResponse.json(ok({ shareToken }));
}
