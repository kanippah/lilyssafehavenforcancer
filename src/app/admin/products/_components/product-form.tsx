"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ImageUploader } from "@/components/admin/image-uploader";
import { slugify } from "@/lib/utils";
import type { ProductFormState } from "../_actions";

export type ProductFormInitial = {
  id: string;
  title: string;
  slug: string;
  description: string;
  story: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  featured: boolean;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  images: { url: string; alt: string | null }[];
  variants: {
    id: string;
    title: string;
    sku: string | null;
    priceCents: number;
    compareAtCents: number | null;
    stock: number;
    trackStock: boolean;
  }[];
  collectionIds: string[];
};

type ImageRow = { key: number; url: string; alt: string };
type VariantRow = {
  key: number;
  id?: string;
  title: string;
  sku: string;
  price: string;
  compareAt: string;
  stock: string;
  trackStock: boolean;
};

function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

const sectionClass = "space-y-4 rounded-[var(--radius-card)] border border-linen bg-paper p-5";
const smallInput = "h-9 px-2.5 py-1 text-sm";

const VARIANT_GRID =
  "grid grid-cols-[minmax(9rem,1.4fr)_minmax(6rem,1fr)_6.5rem_6.5rem_5rem_4rem_4.5rem] items-center gap-2";

export function ProductForm({
  action,
  deleteAction,
  collections,
  initial,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  deleteAction?: () => Promise<{ error: string } | void>;
  collections: { id: string; title: string }[];
  initial?: ProductFormInitial;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  const keyRef = useRef(1000);
  const nextKey = () => ++keyRef.current;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));

  const [images, setImages] = useState<ImageRow[]>(() =>
    (initial?.images ?? []).map((img, i) => ({ key: i, url: img.url, alt: img.alt ?? "" }))
  );

  const [variants, setVariants] = useState<VariantRow[]>(() =>
    initial && initial.variants.length > 0
      ? initial.variants.map((v, i) => ({
          key: i,
          id: v.id,
          title: v.title,
          sku: v.sku ?? "",
          price: centsToInput(v.priceCents),
          compareAt: centsToInput(v.compareAtCents),
          stock: String(v.stock),
          trackStock: v.trackStock,
        }))
      : [{ key: 0, title: "Default", sku: "", price: "", compareAt: "", stock: "0", trackStock: true }]
  );

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function updateImage(key: number, alt: string) {
    setImages((rows) => rows.map((r) => (r.key === key ? { ...r, alt } : r)));
  }

  function updateVariant(key: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const imagesJson = JSON.stringify(images.map(({ url, alt }) => ({ url, alt })));
  const variantsJson = JSON.stringify(
    variants.map(({ id, title: t, sku, price, compareAt, stock, trackStock }) => ({
      id,
      title: t,
      sku,
      price,
      compareAt,
      stock,
      trackStock,
    }))
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="images" value={imagesJson} readOnly />
        <input type="hidden" name="variants" value={variantsJson} readOnly />

        {/* Details */}
        <section className={sectionClass}>
          <h2 className="font-display text-lg text-ink">Details</h2>
          <Field label="Title" htmlFor="product-title">
            <Input
              id="product-title"
              name="title"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="Pressed-lily comfort mug"
            />
          </Field>
          <Field
            label="Slug"
            htmlFor="product-slug"
            hint="Used in the product's web address, e.g. /products/comfort-mug."
          >
            <Input
              id="product-slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className="tabular"
            />
          </Field>
          <Field label="Description" htmlFor="product-description">
            <Textarea
              id="product-description"
              name="description"
              defaultValue={initial?.description ?? ""}
              placeholder="What it is, what it's made of, how it feels."
            />
          </Field>
          <Field
            label="Why this helps — shown on the product page"
            htmlFor="product-story"
            hint="A few plain sentences on what buying this funds."
          >
            <Textarea id="product-story" name="story" defaultValue={initial?.story ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="product-status">
              <Select id="product-status" name="status" defaultValue={initial?.status ?? "DRAFT"}>
                <option value="DRAFT">Draft — hidden from the store</option>
                <option value="ACTIVE">Active — visible in the store</option>
                <option value="ARCHIVED">Archived — retired, kept for records</option>
              </Select>
            </Field>
            <Field label="Tags" htmlFor="product-tags" hint="Separate with commas, e.g. cozy, gift, apparel.">
              <Input id="product-tags" name="tags" defaultValue={initial?.tags.join(", ") ?? ""} />
            </Field>
          </div>
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={initial?.featured ?? false}
              className="h-4 w-4 accent-leaf"
            />
            Featured — surfaced on the home page
          </label>
        </section>

        {/* Images */}
        <section className={sectionClass}>
          <h2 className="font-display text-lg text-ink">Images</h2>
          <p className="text-xs text-ink/55">
            Uploads are added to the list below. The first image is the cover shown across the store.
          </p>
          {images.length > 0 && (
            <ul className="space-y-2">
              {images.map((img, i) => (
                <li
                  key={img.key}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-linen bg-white/50 p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-14 w-14 rounded-lg border border-linen object-cover" />
                  {i === 0 && (
                    <span className="rounded-full bg-petal/40 px-2 py-0.5 text-xs font-semibold text-rose">
                      Cover
                    </span>
                  )}
                  <Input
                    aria-label={`Alt text for image ${i + 1}`}
                    placeholder="Describe this image for screen readers"
                    value={img.alt}
                    onChange={(e) => updateImage(img.key, e.target.value)}
                    className={`${smallInput} min-w-40 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => setImages((rows) => rows.filter((r) => r.key !== img.key))}
                    className="text-xs font-medium text-ink/50 underline underline-offset-2 hover:text-clay"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ImageUploader
            label={images.length > 0 ? "Add another image" : "Add image"}
            previewClassName="h-14 w-14"
            onUploaded={(url) => {
              if (url) setImages((rows) => [...rows, { key: nextKey(), url, alt: "" }]);
            }}
          />
        </section>

        {/* Variants */}
        <section className={sectionClass}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg text-ink">Variants</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setVariants((rows) => [
                  ...rows,
                  { key: nextKey(), title: "", sku: "", price: "", compareAt: "", stock: "0", trackStock: true },
                ])
              }
            >
              Add variant
            </Button>
          </div>
          <p className="text-xs text-ink/55">
            Sizes, colors, or bundle options. Every product needs at least one. Prices are in dollars.
          </p>
          <div className="overflow-x-auto">
            <div className="min-w-[720px] space-y-2">
              <div
                className={`${VARIANT_GRID} px-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-leaf`}
                aria-hidden="true"
              >
                <span>Title</span>
                <span>SKU</span>
                <span>Price $</span>
                <span>Compare-at $</span>
                <span>Stock</span>
                <span className="text-center">Track</span>
                <span />
              </div>
              {variants.map((v, i) => (
                <div key={v.key} className={VARIANT_GRID}>
                  <Input
                    aria-label={`Variant ${i + 1} title`}
                    value={v.title}
                    onChange={(e) => updateVariant(v.key, { title: e.target.value })}
                    placeholder="Small"
                    className={smallInput}
                  />
                  <Input
                    aria-label={`Variant ${i + 1} SKU`}
                    value={v.sku}
                    onChange={(e) => updateVariant(v.key, { sku: e.target.value })}
                    placeholder="Optional"
                    className={`${smallInput} tabular`}
                  />
                  <Input
                    aria-label={`Variant ${i + 1} price in dollars`}
                    inputMode="decimal"
                    value={v.price}
                    onChange={(e) => updateVariant(v.key, { price: e.target.value })}
                    placeholder="0.00"
                    className={`${smallInput} tabular`}
                  />
                  <Input
                    aria-label={`Variant ${i + 1} compare-at price in dollars`}
                    inputMode="decimal"
                    value={v.compareAt}
                    onChange={(e) => updateVariant(v.key, { compareAt: e.target.value })}
                    placeholder="Optional"
                    className={`${smallInput} tabular`}
                  />
                  <Input
                    aria-label={`Variant ${i + 1} stock`}
                    type="number"
                    min={0}
                    step={1}
                    value={v.stock}
                    onChange={(e) => updateVariant(v.key, { stock: e.target.value })}
                    className={`${smallInput} tabular`}
                  />
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      aria-label={`Variant ${i + 1}: track stock`}
                      checked={v.trackStock}
                      onChange={(e) => updateVariant(v.key, { trackStock: e.target.checked })}
                      className="h-4 w-4 accent-leaf"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setVariants((rows) => rows.filter((r) => r.key !== v.key))}
                    disabled={variants.length === 1}
                    className="text-xs font-medium text-ink/50 underline underline-offset-2 hover:text-clay disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Organization */}
        <section className={sectionClass}>
          <h2 className="font-display text-lg text-ink">Organization</h2>
          {collections.length === 0 ? (
            <p className="text-sm text-ink/60">
              No collections yet —{" "}
              <Link href="/admin/collections/new" className="font-medium text-leaf underline underline-offset-2">
                create one
              </Link>{" "}
              to group products in the store.
            </p>
          ) : (
            <fieldset>
              <legend className="mb-2 block text-sm font-semibold text-ink">Collections</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {collections.map((c) => (
                  <label key={c.id} className="flex items-center gap-2.5 text-sm text-ink">
                    <input
                      type="checkbox"
                      name="collectionIds"
                      value={c.id}
                      defaultChecked={initial?.collectionIds.includes(c.id) ?? false}
                      className="h-4 w-4 accent-leaf"
                    />
                    {c.title}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </section>

        {/* SEO */}
        <section className={sectionClass}>
          <h2 className="font-display text-lg text-ink">SEO</h2>
          <Field label="SEO title" htmlFor="product-seo-title" hint="Shown in search results instead of the product title.">
            <Input id="product-seo-title" name="seoTitle" defaultValue={initial?.seoTitle ?? ""} />
          </Field>
          <Field label="SEO description" htmlFor="product-seo-description">
            <Textarea
              id="product-seo-description"
              name="seoDescription"
              defaultValue={initial?.seoDescription ?? ""}
              className="min-h-20"
            />
          </Field>
        </section>

        <div aria-live="polite">
          {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
        </div>
        <div className="flex items-center gap-4">
          <Button disabled={pending} aria-busy={pending}>
            {pending ? "Saving…" : initial ? "Save product" : "Create product"}
          </Button>
          <Link href="/admin/products" className="text-sm font-medium text-ink/60 hover:text-ink">
            Cancel
          </Link>
        </div>
      </form>

      {deleteAction && (
        <section className="space-y-3 rounded-[var(--radius-card)] border border-clay/30 bg-paper p-5">
          <h2 className="font-display text-lg text-ink">Danger area</h2>
          <p className="text-sm text-ink/60">
            Deleting removes this product, its images, and its variants from the store. Past orders keep
            their line items.
          </p>
          <div className="flex items-center gap-3">
            {!confirmingDelete ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(true)}>
                Delete this product…
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={deleting}
                  aria-busy={deleting}
                  onClick={() =>
                    startDelete(async () => {
                      setDeleteError(null);
                      const result = await deleteAction();
                      if (result && "error" in result) setDeleteError(result.error);
                    })
                  }
                >
                  {deleting ? "Deleting…" : "Yes, delete permanently"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Keep it
                </Button>
              </>
            )}
          </div>
          <div aria-live="polite">
            {deleteError && <p className="text-sm font-medium text-clay">{deleteError}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
