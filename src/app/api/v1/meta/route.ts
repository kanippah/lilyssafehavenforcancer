import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSettings, getTotalRaisedCents } from "@/lib/settings";

export async function GET() {
  const [settings, collections, totalRaisedCents] = await Promise.all([
    getSettings(),
    db.collection.findMany({
      orderBy: { position: "asc" },
      select: { slug: true, title: true },
    }),
    getTotalRaisedCents(),
  ]);

  return NextResponse.json({
    data: {
      storeName: settings.storeName,
      tagline: settings.tagline,
      logoUrl: settings.logoUrl,
      currency: settings.currency,
      announcement: settings.announcement,
      freeShippingThresholdCents: settings.freeShippingThresholdCents,
      shippingFlatCents: settings.shippingFlatCents,
      impactUnitCents: settings.impactUnitCents,
      impactUnitLabel: settings.impactUnitLabel,
      donationEnabled: settings.donationEnabled,
      collections,
      totalRaisedCents,
    },
  });
}
