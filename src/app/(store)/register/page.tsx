import type { Metadata } from "next";
import Link from "next/link";
import { LilyMark } from "@/components/lily-mark";
import { RegisterForm } from "./_components/register-form";

export const metadata: Metadata = {
  title: "Join the haven",
  description: "Create your Lily's Safe Haven account.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next =
    typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//")
      ? sp.next
      : undefined;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 sm:px-6">
      <div className="rise text-center">
        <LilyMark className="mx-auto h-10 w-10 text-leaf" />
        <p className="eyebrow mt-4">New account</p>
        <h1 className="mt-2 text-3xl">Join the haven</h1>
        <p className="mt-3 text-sm text-ink/60">
          Keep a wishlist, track your orders, and watch the ledger of what your kindness funds.
        </p>
      </div>

      <div className="rise rise-1 mt-8 rounded-[var(--radius-card)] border border-linen bg-parchment/70 p-6 sm:p-7">
        <RegisterForm next={next} />
      </div>

      <div className="rise rise-2 mt-6 text-center text-sm text-ink/65">
        <p>
          Already have an account?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-semibold text-leaf underline underline-offset-2 hover:text-fern"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
