import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { ok, err } from "../../../../lib/api";
import type { DocumentType, ResetFreq } from "@repo/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const businessId = session.user.businessId;

  const configs = await prisma.invoiceNumberConfig.findMany({
    where: { businessId },
    orderBy: { documentType: "asc" },
  });

  return NextResponse.json(ok(configs));
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const businessId = session.user.businessId;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(err("BAD_REQUEST", "Invalid JSON body"), { status: 400 });
  }

  const {
    documentType,
    prefix,
    suffix,
    separator,
    paddingDigits,
    startingNumber,
    resetPeriod,
  } = body as {
    documentType?: string;
    prefix?: string | null;
    suffix?: string | null;
    separator?: string;
    paddingDigits?: number;
    startingNumber?: number;
    resetPeriod?: string;
  };

  if (!documentType) {
    return NextResponse.json(err("VALIDATION_ERROR", "documentType is required"), { status: 400 });
  }

  // Verify the config belongs to this business
  const existing = await prisma.invoiceNumberConfig.findUnique({
    where: { businessId_documentType: { businessId, documentType: documentType as DocumentType } },
  });

  if (!existing) {
    return NextResponse.json(
      err("NOT_FOUND", `No config found for documentType: ${documentType}`),
      { status: 404 },
    );
  }

  const updated = await prisma.invoiceNumberConfig.update({
    where: { businessId_documentType: { businessId, documentType: documentType as DocumentType } },
    data: {
      ...(prefix !== undefined && { prefix: prefix ?? null }),
      ...(suffix !== undefined && { suffix: suffix ?? null }),
      ...(separator !== undefined && { separator }),
      ...(paddingDigits !== undefined && { paddingDigits: Number(paddingDigits) }),
      ...(startingNumber !== undefined && { startingNumber: Number(startingNumber) }),
      ...(resetPeriod !== undefined && { resetFrequency: resetPeriod as ResetFreq }),
    },
  });

  return NextResponse.json(ok(updated));
}
