import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const CART_COOKIE = "lsh_cart";

export type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        variant: { include: { product: { include: { images: true } } } };
      };
    };
  };
}>;

const cartInclude = {
  items: {
    orderBy: { id: "asc" as const },
    include: {
      variant: { include: { product: { include: { images: true } } } },
    },
  },
};

/** The current cart (user's cart when signed in, cookie cart otherwise). Null when empty/absent. */
export const getCart = cache(async (): Promise<CartWithItems | null> => {
  const user = await getSessionUser();
  if (user) {
    return db.cart.findUnique({ where: { userId: user.id }, include: cartInclude });
  }
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return null;
  return db.cart.findUnique({ where: { token }, include: cartInclude });
});

/** Cart for mutation: creates one (and the cookie) if none exists yet. */
export async function getOrCreateCart(): Promise<CartWithItems> {
  const user = await getSessionUser();
  if (user) {
    const existing = await db.cart.findUnique({ where: { userId: user.id }, include: cartInclude });
    if (existing) return existing;
    return db.cart.create({ data: { userId: user.id }, include: cartInclude });
  }
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (token) {
    const existing = await db.cart.findUnique({ where: { token }, include: cartInclude });
    if (existing) return existing;
  }
  const cart = await db.cart.create({ data: {}, include: cartInclude });
  jar.set(CART_COOKIE, cart.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 90 * 24 * 60 * 60,
  });
  return cart;
}

/** After login/registration: fold the guest cookie cart into the user's cart. */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return;
  const guest = await db.cart.findUnique({ where: { token }, include: { items: true } });
  if (!guest || guest.userId === userId) return;

  const mine = await db.cart.findUnique({ where: { userId }, include: { items: true } });
  if (!mine) {
    // Claim the guest cart wholesale.
    await db.cart.update({ where: { id: guest.id }, data: { userId } });
  } else {
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
  jar.delete(CART_COOKIE);
}

export function cartSubtotalCents(cart: CartWithItems | null): number {
  if (!cart) return 0;
  return cart.items.reduce((sum, i) => sum + i.variant.priceCents * i.quantity, 0);
}

export function cartItemCount(cart: CartWithItems | null): number {
  if (!cart) return 0;
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}
