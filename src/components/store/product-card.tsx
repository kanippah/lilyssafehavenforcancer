import Link from "next/link";
import { Price } from "@/components/store/price";
import { Badge } from "@/components/ui/badge";
import { impactLine } from "@/lib/impact";
import type { Prisma, Setting } from "@prisma/client";

export type ProductForCard = Prisma.ProductGetPayload<{
  include: { images: true; variants: true };
}>;

export function ProductCard({
  product,
  settings,
}: {
  product: ProductForCard;
  settings: Setting;
}) {
  const variant = [...product.variants].sort((a, b) => a.priceCents - b.priceCents)[0];
  const image = [...product.images].sort((a, b) => a.position - b.position)[0];
  const soldOut =
    product.variants.length > 0 && product.variants.every((v) => v.trackStock && v.stock <= 0);
  const onSale = variant?.compareAtCents != null && variant.compareAtCents > variant.priceCents;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-parchment">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt ?? product.title}
            className="aspect-square w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="aspect-square w-full" />
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {soldOut && <Badge tone="neutral">Sold out</Badge>}
          {!soldOut && onSale && <Badge tone="rose">Kind price</Badge>}
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="font-sans text-[0.98rem] font-semibold leading-snug text-ink group-hover:underline group-hover:decoration-petal group-hover:decoration-2 group-hover:underline-offset-4">
          {product.title}
        </h3>
        {variant && (
          <p className="text-[0.95rem]">
            <Price cents={variant.priceCents} compareAtCents={variant.compareAtCents} currency={settings.currency} />
          </p>
        )}
        {variant && (
          <p className="ledger-line" aria-label="What this purchase funds">
            → {impactLine(variant.priceCents, settings)}
          </p>
        )}
      </div>
    </Link>
  );
}
