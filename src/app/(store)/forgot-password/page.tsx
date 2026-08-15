import type { Metadata } from "next";
import Link from "next/link";
import { LilyMark } from "@/components/lily-mark";
import { ForgotPasswordForm } from "./_components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a password reset link for your Lily's Safe Haven account.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 sm:px-6">
      <div className="rise text-center">
        <LilyMark className="mx-auto h-10 w-10 text-leaf" />
        <p className="eyebrow mt-4">Password reset</p>
        <h1 className="mt-2 text-3xl">Let&apos;s get you back in</h1>
        <p className="mt-3 text-sm text-ink/60">
          Enter the email on your account and we&apos;ll send a link to choose a new password. The
          link works for one hour.
        </p>
      </div>

      <div className="rise rise-1 mt-8 rounded-[var(--radius-card)] border border-linen bg-parchment/70 p-6 sm:p-7">
        <ForgotPasswordForm />
      </div>

      <div className="rise rise-2 mt-6 space-y-2 text-center text-sm text-ink/65">
        <p>
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-semibold text-leaf underline underline-offset-2 hover:text-fern"
          >
            Sign in
          </Link>
        </p>
        <p>
          No account yet?{" "}
          <Link href="/register" className="text-ink/60 underline underline-offset-2 hover:text-ink">
            Join the haven
          </Link>
        </p>
      </div>
    </div>
  );
}
