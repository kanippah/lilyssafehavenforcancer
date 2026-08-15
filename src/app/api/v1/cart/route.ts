import { NextResponse } from "next/server";
import { z } from "zod";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { getBearerUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import type { CartWithItems } from "@/lib/cart";

const cartInclude = {
  items: {
    orderBy: { id: "asc" as const },
    include: {
      variant: {
        include: {
          product: { include: { images: { orderBy: { position: "asc" as const } } } },
        },
      },
    },
  },
};

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

function shapeCart(cart: CartWithItems | null, currency: string) {
  const items = (cart?.items ?? []).map((item) => {
    const image = item.variant.product.images[0] ?? null;
    return {
      id: item.id,
      quantity: item.quantity,
      lineCents: item.variant.priceCents * item.quantity,
      variant: {
        id: item.variant.id,
        title: item.variant.title,
        priceCents: item.variant.priceCents,
        compareAtCents: item.variant.compareAtCents,
        stock: item.variant.stock,
        trackStock: item.variant.trackStock,
      },
      product: {
        id: item.variant.product.id,
        title: item.variant.product.title,
        slug: item.variant.product.slug,
        image: image ? { url: image.url, alt: image.alt ?? item.variant.product.title } : null,
      },
    };
  });
  return {
    // Only guest carts hand out their token; user carts are reached via the bearer token.
    cartToken: cart && !cart.userId ? cart.token : null,
    items,
    subtotalCents: items.reduce((sum, i) => sum + i.lineCents, 0),
    currency,
  };
}

/** The caller's cart: bearer user's cart first, else the X-Cart-Token guest cart. */
async function resolveCart(
  req: Request
): Promise<{ cart: CartWithItems | null; user: User | null }> {
  const user = await getBearerUser(req);
  if (user) {
    const cart = await db.cart.findUnique({ where: { userId: user.id }, include: cartInclude });
    return { cart, user };
  }
  const token = req.headers.get("x-cart-token");
  if (token) {
    const cart = await db.cart.findUnique({ where: { token }, include: cartInclude });
    // A cart claimed by an account is not reachable with just its token.
    return { cart: cart && cart.userId ? null : cart, user: null };
  }
  return { cart: null, user: null };
}

async function loadCart(id: string): Promise<CartWithItems> {
  return db.cart.findUniqueOrThrow({ where: { id }, include: cartInclude });
}

export async function GET(req: Request) {
  const [{ cart }, settings] = await Promise.all([resolveCart(req), getSettings()]);
  return NextResponse.json({ data: shapeCart(cart, settings.currency) });
}

const postSchema = z.object({
  variantId: z.string().min(1, "variantId is required."),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export async function POST(req: Request) {
  const json = await readJson(req);
  if (json === null) return fail("Send a JSON body with variantId and quantity.", 400);

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);
  const { variantId, quantity } = parsed.data;

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant || variant.product.status !== "ACTIVE") {
    return fail("This item isn't available right now.", 404);
  }

  const user = await getBearerUser(req);
  let cart: CartWithItems | null;
  if (user) {
    cart =
      (await db.cart.findUnique({ where: { userId: user.id }, include: cartInclude })) ??
      (await db.cart.create({ data: { userId: user.id }, include: cartInclude }));
  } else {
    const token = req.headers.get("x-cart-token");
    cart = token ? await db.cart.findUnique({ where: { token }, include: cartInclude }) : null;
    if (cart?.userId) cart = null; // claimed carts need the bearer token
    if (!cart) cart = await db.cart.create({ data: {}, include: cartInclude });
  }

  const existing = cart.items.find((i) => i.variantId === variantId);
  const nextQty = Math.min(99, (existing?.quantity ?? 0) + quantity);
  if (variant.trackStock && nextQty > variant.stock) {
    return fail(
      variant.stock === 0 ? "Sold out for now." : `Only ${variant.stock} left in stock.`,
      409
    );
  }

  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
  } else {
    await db.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
  }

  const [updated, settings] = await Promise.all([loadCart(cart.id), getSettings()]);
  return NextResponse.json({ data: shapeCart(updated, settings.currency) });
}

const patchSchema = z.object({
  itemId: z.string().min(1, "itemId is required."),
  quantity: z.coerce.number().int().min(0).max(99),
});

export async function PATCH(req: Request) {
  const json = await readJson(req);
  if (json === null) return fail("Send a JSON body with itemId and quantity.", 400);

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 400);
  const { itemId, quantity } = parsed.data;

  const { cart } = await resolveCart(req);
  const item = cart?.items.find((i) => i.id === itemId);
  if (!cart || !item) return fail("That item is no longer in your cart.", 404);

  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
  } else {
    if (item.variant.trackStock && quantity > item.variant.stock) {
      return fail(`Only ${item.variant.stock} left in stock.`, 409);
    }
    await db.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  const [updated, settings] = await Promise.all([loadCart(cart.id), getSettings()]);
  return NextResponse.json({ data: shapeCart(updated, settings.currency) });
}

const deleteSchema = z.object({
  itemId: z.string().min(1, "itemId is required."),
});

export async function DELETE(req: Request) {
  // Accept the item id in the JSON body or as ?itemId= for clients that
  // can't send DELETE bodies.
  const json = await readJson(req);
  const fromQuery = new URL(req.url).searchParams.get("itemId");
  const parsed = deleteSchema.safeParse(
    json && typeof json === "object" && "itemId" in json ? json : { itemId: fromQuery ?? "" }
  );
  if (!parsed.success) return fail("Send itemId in the JSON body or as ?itemId=.", 400);

  const { cart } = await resolveCart(req);
  const item = cart?.items.find((i) => i.id === parsed.data.itemId);
  if (!cart || !item) return fail("That item is no longer in your cart.", 404);

  await db.cartItem.delete({ where: { id: item.id } });

  const [updated, settings] = await Promise.all([loadCart(cart.id), getSettings()]);
  return NextResponse.json({ data: shapeCart(updated, settings.currency) });
}
