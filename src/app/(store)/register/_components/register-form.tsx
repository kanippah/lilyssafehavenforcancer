"use client";

import { useActionState } from "react";
import { register, type AuthState } from "@/lib/actions/auth-actions";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RegisterForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(register, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Name" htmlFor="register-name">
        <Input id="register-name" name="name" autoComplete="name" required placeholder="Your name" />
      </Field>
      <Field label="Email" htmlFor="register-email">
        <Input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>
      <Field label="Password" htmlFor="register-password" hint="At least 8 characters.">
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <div aria-live="polite">
        {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">
        {pending ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}
