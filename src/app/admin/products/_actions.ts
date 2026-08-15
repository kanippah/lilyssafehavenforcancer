"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";
import { parseMoneyToCents } from "@/lib/money";
import { slugify } from "@/lib/utils";

export type ProductFormState = { error?: string } | undefined;

const imageSchema = z.object({
  url: z.string().trim().min(1, "An image is missing its file — remove it and upload again."),
  alt: z.string().trim().max(300).optional().nullable(),
});

const variantSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Every variant needs a title.").max(120),
  sku: z.string().trim().max(64).optional().nullable(),
  price: z.union([z.string(), z.number()]),
  compareAt: z.union([z.string(), z.number()]).optional().nullable(),
  stock: z.coerce.number().int("Stock must be a whole number.").min(0, "Stock can't be negative.").max(1_000_000),
  trackStock: z.boolean(),
});

const productSchema = z.object({
  title: z.string().trim().min(2, "Give the product a title (at least 2 characters).").max(140),
  slug: z
    .string()
    .trim()
    .transform((s) => slugify(s))
    .refine((s) => s.length >= 2, "Give the product a slug — letters, numbers, and dashes."),
  description: z.string().trim().max(10_000),
  story: z.string().trim().max(10_000),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  featured: z.boolean(),
  tags: z.array(z.string().trim().max(60)).max(20, "Keep it to 20 tags or fewer."),
  seoTitle: z.string().trim().max(160).optional(),
  seoDescription: z.string().trim().max(320).optional(),
  images: z.array(imageSchema).max(16, "A product can have at most 16 images."),
  variants: z.array(variantSchema).min(1, "Add at least one variant.").max(50),
  collectionIds: z.array(z.string()),
});

type ParsedVariant = {
  id?: string;
  title: string;
  sku: string | null;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  trackStock: boolean;
  position: number;
};

async function staffOk(): Promise<boolean> {
  return isStaff(await getSessionUser());
}

function readForm(formData: FormData): Record<string, unknown> | { parseError: string } {
  let images: unknown;
  let variants: unknown;
  try {
    images = JSON.parse(String(formData.get("images") || "[]"));
    variants = JSON.parse(String(formData.get("variants") || "[]"));
  } catch {
    return { parseError: "The form data didn't arrive intact — reload the page and try again." };
  }
  return {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? "").trim() || String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    story: String(formData.get("story") ?? ""),
    status: String(formData.get("status") ?? "DRAFT"),
    featured: formData.get("featured") === "on",
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    seoTitle: String(formData.get("seoTitle") ?? "").trim() || undefined,
    seoDescription: String(formData.get("seoDescription") ?? "").trim() || undefined,
    images,
    variants,
    collectionIds: formData.getAll("collectionIds").map(String),
  };
}

/** Validates the whole form; returns either data ready for Prisma or a friendly error. */
async function prepare(
  formData: FormData,
  currentId?: string
): Promise<
  | { error: string }
  | {
      fields: {
        title: string;
        slug: string;
        description: string;
        story: string;
        status: "DRAFT" | "ACTIVE" | "ARCHIVED";
        featured: boolean;
        tags: string[];
        seoTitle: string | null;
        seoDescription: string | null;
      };
      images: { url: string; alt: string | null; position: number }[];
      variants: ParsedVariant[];
      collectionIds: string[];
    }
> {
  const candidate = readForm(formData);
  if ("parseError" in candidate && typeof candidate.parseError === "string") {
    return { error: candidate.parseError };
  }

  const parsed = productSchema.safeParse(candidate);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const variants: ParsedVariant[] = [];
  for (const [i, v] of data.variants.entries()) {
    const priceCents = parseMoneyToCents(v.price);
    if (priceCents <= 0) {
      return { error: `Variant ${i + 1} ("${v.title}") needs a price above $0.` };
    }
    const compareParsed =
      v.compareAt == null || String(v.compareAt).trim() === "" ? 0 : parseMoneyToCents(v.compareAt);
    variants.push({
      id: v.id,
      title: v.title,
      sku: v.sku?.trim() || null,
      priceCents,
      compareAtCents: compareParsed > 0 ? compareParsed : null,
      stock: v.stock,
      trackStock: v.trackStock,
      position: i,
    });
  }

  const clash = await db.product.findUnique({ where: { slug: data.slug } });
  if (clash && clash.id !== currentId) {
    return { error: `The slug "${data.slug}" is already used by "${clash.title}" — pick another.` };
  }

  // Keep only collection ids that actually exist.
  const validCollections =
    data.collectionIds.length > 0
      ? await db.collection.findMany({
          where: { id: { in: data.collectionIds } },
          select: { id: true },
        })
      : [];

  return {
    fields: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      story: data.story,
      status: data.status,
      featured: data.featured,
      tags: data.tags,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
    },
    images: data.images.map((img, i) => ({ url: img.url, alt: img.alt?.trim() || null, position: i })),
    variants,
    collectionIds: validCollections.map((c) => c.id),
  };
}

export async function createProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  if (!(await staffOk())) return { error: "You don't have permission to do that." };

  const prepared = await prepare(formData);
  if ("error" in prepared) return prepared;

  try {
    await db.product.create({
      data: {
        ...prepared.fields,
        images: { create: prepared.images },
        variants: {
          create: prepared.variants.map((v) => ({
            title: v.title,
            sku: v.sku,
            priceCents: v.priceCents,
            compareAtCents: v.compareAtCents,
            stock: v.stock,
            trackStock: v.trackStock,
            position: v.position,
          })),
        },
        collections: { create: prepared.collectionIds.map((collectionId) => ({ collectionId })) },
      },
    });
  } catch (err) {
    console.error("[admin] product create failed:", err);
    return { error: "Couldn't save the product — nothing was created. Check the fields and try again." };
  }

  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  if (!(await staffOk())) return { error: "You don't have permission to do that." };

  const current = await db.product.findUnique({ where: { id }, include: { variants: true } });
  if (!current) return { error: "That product no longer exists — it may have been deleted." };

  const prepared = await prepare(formData, id);
  if ("error" in prepared) return prepared;

  const existingVariantIds = new Set(current.variants.map((v) => v.id));
  const keepIds = prepared.variants
    .filter((v) => v.id && existingVariantIds.has(v.id))
    .map((v) => v.id as string);

  try {
    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: prepared.fields });

      await tx.productImage.deleteMany({ where: { productId: id } });
      if (prepared.images.length > 0) {
        await tx.productImage.createMany({
          data: prepared.images.map((img) => ({ ...img, productId: id })),
        });
      }

      await tx.collectionProduct.deleteMany({ where: { productId: id } });
      if (prepared.collectionIds.length > 0) {
        await tx.collectionProduct.createMany({
          data: prepared.collectionIds.map((collectionId) => ({ productId: id, collectionId })),
        });
      }

      // Removed variants: past order lines keep their snapshot (relation is SetNull).
      await tx.productVariant.deleteMany({ where: { productId: id, id: { notIn: keepIds } } });
      for (const v of prepared.variants) {
        const { id: variantId, ...data } = v;
        if (variantId && existingVariantIds.has(variantId)) {
          await tx.productVariant.update({ where: { id: variantId }, data });
        } else {
          await tx.productVariant.create({ data: { ...data, productId: id } });
        }
      }
    });
  } catch (err) {
    console.error("[admin] product update failed:", err);
    return { error: "Couldn't save those changes — nothing was updated. Check the variants and try again." };
  }

  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function deleteProduct(id: string): Promise<{ error: string } | void> {
  if (!(await staffOk())) return { error: "You don't have permission to do that." };

  try {
    await db.product.delete({ where: { id } });
  } catch (err) {
    console.error("[admin] product delete failed:", err);
    return { error: "Couldn't delete this product — reload the page and try again." };
  }

  revalidatePath("/", "layout");
  redirect("/admin/products");
}
