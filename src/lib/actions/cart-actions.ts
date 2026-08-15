"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCart, getOrCreateCart } from "@/lib/cart";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addToCart(variantId: string, quantity = 1): Promise<ActionResult> {
  try {
    const qty = Math.max(1, Math.min(99, Math.floor(quantity)));
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant || variant.product.status !== "ACTIVE") {
      return { ok: false, error: "This item isn't available right now." };
    }
    const cart = await getOrCreateCart();
    const existing = cart.items.find((i) => i.variantId === variantId);
    const nextQty = (existing?.quantity ?? 0) + qty;
    if (variant.trackStock && nextQty > variant.stock) {
      return { ok: false, error: variant.stock === 0 ? "Sold out for now." : `Only ${variant.stock} left in stock.` };
    }
    if (existing) {
      await db.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
    } else {
      await db.cartItem.create({ data: { cartId: cart.id, variantId, quantity: qty } });
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[cart] add failed:", err);
    return { ok: false, error: "Couldn't add that to your cart. Please try again." };
  }
}

export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<ActionResult> {
  try {
    const cart = await getCart();
    const item = cart?.items.find((i) => i.id === itemId);
    if (!cart || !item) return { ok: false, error: "That item is no longer in your cart." };
    const qty = Math.floor(quantity);
    if (qty <= 0) {
      await db.cartItem.delete({ where: { id: itemId } });
    } else {
      if (item.variant.trackStock && qty > item.variant.stock) {
        return { ok: false, error: `Only ${item.variant.stock} left in stock.` };
      }
      await db.cartItem.update({ where: { id: itemId }, data: { quantity: Math.min(99, qty) } });
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("[cart] update failed:", err);
    return { ok: false, error: "Couldn't update your cart. Please try again." };
  }
}

export async function removeCartItem(itemId: string): Promise<ActionResult> {
  return updateCartItemQuantity(itemId, 0);
}
