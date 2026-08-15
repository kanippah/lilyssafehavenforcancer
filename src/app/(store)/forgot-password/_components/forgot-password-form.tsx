"use client";

import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "@/lib/actions/auth-actions";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Email" htmlFor="forgot-email">
        <Input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>
      <div aria-live="polite">
        {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
        {state?.message && <p className="text-sm font-medium text-pine">{state.message}</p>}
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
