import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getOrCreateCart } from "@/lib/cart";
import { releaseOrderReservations } from "@/lib/orders";

/**
 * Stripe cancel_url target: the customer backed out of the card page. Cancel
 * the still-PENDING order (idempotently), release its stock + discount use,
 * and put the items back in their basket so they can resume checkout.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ number: string }> }) {
  const { number } = await ctx.params;
  const order = await db.order.findUnique({
    where: { number },
    include: { items: true },
  });

  if (order && order.paymentMethod === "stripe" && order.status === "PENDING") {
    await db.$transaction(async (tx) => {
      const closed = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      if (closed.count === 1) {
        await releaseOrderReservations(tx, order);
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            message: "Card payment cancelled — items returned to the customer's basket.",
          },
        });
      }
    });

    // Rebuild the basket from the order snapshot (variants that still exist and are active).
    try {
      const cart = await getOrCreateCart();
      for (const item of order.items) {
        if (!item.variantId) continue;
        const variant = await db.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });
        if (!variant || variant.product.status !== "ACTIVE") continue;
        const existing = await db.cartItem.findUnique({
          where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
        });
        const quantity = Math.min(99, (existing?.quantity ?? 0) + item.quantity);
        if (existing) {
          await db.cartItem.update({ where: { id: existing.id }, data: { quantity } });
        } else {
          await db.cartItem.create({
            data: { cartId: cart.id, variantId: item.variantId, quantity },
          });
        }
      }
    } catch (err) {
      console.error("[checkout] restoring basket after cancel failed:", err);
    }
    revalidatePath("/", "layout");
  }

  redirect("/cart");
}
