import { NextResponse } from "next/server";
import { z } from "zod";
import type { Address, User } from "@prisma/client";
import { db } from "@/lib/db";
import { getBearerUser } from "@/lib/auth";

function fail(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function shapeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function shapeAddress(address: Address | null) {
  if (!address) return null;
  return {
    id: address.id,
    label: address.label,
    fullName: address.fullName,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    phone: address.phone,
    isDefault: address.isDefault,
  };
}

export async function GET(req: Request) {
  const user = await getBearerUser(req);
  if (!user) return fail("Sign in to continue.", 401);

  const address = await db.address.findFirst({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });

  return NextResponse.json({
    data: { user: shapeUser(user), defaultAddress: shapeAddress(address) },
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name (at least 2 characters).").optional(),
  phone: z.string().trim().max(40, "That phone number looks too long.").nullable().optional(),
});

export async function PATCH(req: Request) {
  const user = await getBearerUser(req);
  if (!user) return fail("Sign in to continue.", 401);

  const json = await readJson(req);
  if (json === null) return fail("Send a JSON body with the fields to update.", 400);

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const { name, phone } = parsed.data;
  if (name === undefined && phone === undefined) {
    return fail("Include name or phone to update.", 400);
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
    },
  });

  return NextResponse.json({ data: { user: shapeUser(updated) } });
}
