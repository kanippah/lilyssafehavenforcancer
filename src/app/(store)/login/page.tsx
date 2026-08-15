import type { Metadata } from "next";
import Link from "next/link";
import { LilyMark } from "@/components/lily-mark";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Lily's Safe Haven account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next =
    typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") && !sp.next.includes("\\")
      ? sp.next
      : undefined;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 sm:px-6">
      <div className="rise text-center">
        <LilyMark className="mx-auto h-10 w-10 text-leaf" />
        <p className="eyebrow mt-4">Your account</p>
        <h1 className="mt-2 text-3xl">Welcome back to the haven</h1>
        <p className="mt-3 text-sm text-ink/60">
          Sign in to see your orders, your wishlist, and the care your purchases have funded.
        </p>
      </div>

      <div className="rise rise-1 mt-8 rounded-[var(--radius-card)] border border-linen bg-parchment/70 p-6 sm:p-7">
        <LoginForm next={next} />
      </div>

      <div className="rise rise-2 mt-6 space-y-2 text-center text-sm text-ink/65">
        <p>
          New here?{" "}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className="font-semibold text-leaf underline underline-offset-2 hover:text-fern"
          >
            Join the haven
          </Link>
        </p>
        <p>
          <Link
            href="/forgot-password"
            className="text-ink/60 underline underline-offset-2 hover:text-ink"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
