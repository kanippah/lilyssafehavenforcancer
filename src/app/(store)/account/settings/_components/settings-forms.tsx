"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateProfile, changePassword, type SettingsFormState } from "../_actions";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProfileForm({
  defaultName,
  defaultPhone,
  email,
  supportEmail,
}: {
  defaultName: string;
  defaultPhone: string;
  email: string;
  supportEmail: string;
}) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateProfile,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Name" htmlFor="profile-name">
        <Input
          id="profile-name"
          name="name"
          autoComplete="name"
          required
          defaultValue={defaultName}
        />
      </Field>
      <Field label="Phone" htmlFor="profile-phone" hint="Optional — only used for order questions.">
        <Input
          id="profile-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={defaultPhone}
        />
      </Field>
      <Field
        label="Email"
        htmlFor="profile-email"
        hint={`Your email can't be changed here — write to ${supportEmail} and we'll take care of it.`}
      >
        <Input id="profile-email" type="email" value={email} readOnly className="bg-parchment/70" />
      </Field>
      <div aria-live="polite">
        {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
        {state?.message && <p className="text-sm font-medium text-pine">{state.message}</p>}
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    changePassword,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.message) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <Field label="Current password" htmlFor="password-current">
        <Input
          id="password-current"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="password-new" hint="At least 8 characters.">
          <Input
            id="password-new"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Field label="Confirm new password" htmlFor="password-confirm">
          <Input
            id="password-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
      </div>
      <div aria-live="polite">
        {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
        {state?.message && <p className="text-sm font-medium text-pine">{state.message}</p>}
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
