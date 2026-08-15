import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { signSessionToken, verifyPassword } from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
  password: z.string().min(1, "Enter your password."),
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
 * the account at sign-in. Mirrors mergeGuestCartIntoUser, which can't be
 * reused here because it reads the web cookie jar.
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
  if (json === null) return fail("Send a JSON body with email and password.", 400);

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return fail("Email or password doesn't match our records.", 401);
  }

  await adoptGuestCart(req, user.id);
  const token = await signSessionToken(user);
  return NextResponse.json({
    data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } },
  });
}
