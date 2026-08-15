import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { AddressBook } from "./_components/address-book";

export const metadata: Metadata = {
  title: "Addresses",
  description: "The places your orders ship to.",
};

export default async function AccountAddressesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account/addresses");

  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { fullName: "asc" }],
  });

  return (
    <div>
      <header>
        <h1 className="text-3xl">Addresses</h1>
        <p className="mt-2 text-sm text-ink/60">
          The places your orders ship to. Your default address is offered first at checkout.
        </p>
      </header>
      <div className="mt-8">
        <AddressBook addresses={addresses} />
      </div>
    </div>
  );
}
