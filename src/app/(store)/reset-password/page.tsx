import type { Metadata } from "next";
import Link from "next/link";
import { LilyMark } from "@/components/lily-mark";
import { LinkButton } from "@/components/ui/button";
import { ResetPasswordForm } from "./_components/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Lily's Safe Haven account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" && sp.token.length > 0 ? sp.token : undefined;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 sm:px-6">
      <div className="rise text-center">
        <LilyMark className="mx-auto h-10 w-10 text-leaf" />
        <p className="eyebrow mt-4">Password reset</p>
        <h1 className="mt-2 text-3xl">Choose a new password</h1>
        {token && (
          <p className="mt-3 text-sm text-ink/60">
            Pick something with at least 8 characters. You&apos;ll be signed in right after.
          </p>
        )}
      </div>

      {token ? (
        <div className="rise rise-1 mt-8 rounded-[var(--radius-card)] border border-linen bg-parchment/70 p-6 sm:p-7">
          <ResetPasswordForm token={token} />
        </div>
      ) : (
        <div className="rise rise-1 mt-8 rounded-[var(--radius-card)] border border-linen bg-parchment/70 p-6 text-center sm:p-7">
          <p className="text-sm text-ink/70">
            This page needs the link from your reset email — open the email and follow it directly.
            If your link has expired, request a fresh one below.
          </p>
          <LinkButton href="/forgot-password" variant="outline" className="mt-4">
            Request a new link
          </LinkButton>
        </div>
      )}

      <div className="rise rise-2 mt-6 text-center text-sm text-ink/65">
        <p>
          Back to{" "}
          <Link
            href="/login"
            className="font-semibold text-leaf underline underline-offset-2 hover:text-fern"
          >
            sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
