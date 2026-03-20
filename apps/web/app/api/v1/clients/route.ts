import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { partySchema } from "../../../../schemas/client.schema";
import { ok, err } from "../../../../lib/api";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "CLIENT";
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const where = {
    businessId: session.user.businessId,
    type: { in: type === "ALL" ? ["CLIENT", "VENDOR", "BOTH"] : [type, "BOTH"] } as never,
    isActive: true,
    ...(search && {
      OR: [
        { displayName: { contains: search, mode: "insensitive" as const } },
        { gstin: { contains: search, mode: "insensitive" as const } },
        { contactPhone: { contains: search } },
        { contactEmail: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [parties, total] = await Promise.all([
    prisma.party.findMany({
      where,
      orderBy: { displayName: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.party.count({ where }),
  ]);

  return NextResponse.json(
    ok(parties, { page, limit, total, totalPages: Math.ceil(total / limit) })
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const body = await req.json();
  const parsed = partySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      err("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const party = await prisma.party.create({
    data: { ...parsed.data, businessId: session.user.businessId },
  });

  return NextResponse.json(ok(party), { status: 201 });
}
