import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, signSessionToken } from "@/lib/auth";

const bodySchema = z.object({
  name: z.string().trim().min(2, "Tell us your name (at least 2 characters)."),
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
  password: z.string().min(8, "Passwords need at least 8 characters."),
});

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

/**
 * When the client was shopping as a guest (X-Cart-Token), fold that cart into
 * the new account so nothing is lost at sign-up. Mirrors mergeGuestCartIntoUser,
 * which can't be reused here because it reads the web cookie jar.
 */
async function adoptGuestCart(req: Request, userId: string): Promise<void> {
  const token = req.headers.get("x-cart-token");
  if (!token) return;
  const guest = await db.cart.findUnique({ where: { token }, include: { items: true } });
  if (!guest || guest.userId) return; // absent, or already owned by an account

  const mine = await db.cart.findUnique({ where: { userId }, include: { items: true } });
  if (!mine) {
    await db.cart.update({ where: { id: guest.id }, data: { userId } });
    return;
  }
  for (const item of guest.items) {
    const existing = mine.items.find((i) => i.variantId === item.variantId);
    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: Math.min(99, existing.quantity + item.quantity) },
      });
    } else {
      await db.cartItem.create({
        data: { cartId: mine.id, variantId: item.variantId, quantity: item.quantity },
      });
    }
  }
  await db.cart.delete({ where: { id: guest.id } });
}

export async function POST(req: Request) {
  const json = await readJson(req);
  if (json === null) return fail("Send a JSON body with name, email, and password.", 400);

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return fail("An account with that email already exists — try signing in.", 409);

  try {
    const user = await db.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
    });
    await adoptGuestCart(req, user.id);
    const token = await signSessionToken(user);
    return NextResponse.json(
      { data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("An account with that email already exists — try signing in.", 409);
    }
    throw err;
  }
}
