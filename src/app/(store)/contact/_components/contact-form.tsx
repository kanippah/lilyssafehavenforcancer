"use client";

import { useActionState } from "react";
import { submitContactMessage, type StoreActionState } from "@/lib/actions/store-actions";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LilyMark } from "@/components/lily-mark";

export function ContactForm() {
  const [state, formAction, pending] = useActionState<StoreActionState, FormData>(
    submitContactMessage,
    undefined
  );

  if (state?.message) {
    return (
      <div
        role="status"
        className="flex h-full flex-col items-center justify-center rounded-[var(--radius-card)] bg-blush px-6 py-16 text-center"
      >
        <LilyMark className="h-11 w-11 text-rose" />
        <p className="mt-5 font-display text-2xl text-ink">Message received</p>
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink/70">{state.message}</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-[var(--radius-card)] border border-linen bg-parchment p-6 sm:p-7"
    >
      <Field label="Your name" htmlFor="contact-name">
        <Input id="contact-name" name="name" required minLength={2} autoComplete="name" />
      </Field>
      <Field label="Email" htmlFor="contact-email">
        <Input id="contact-email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Subject" htmlFor="contact-subject" hint="Optional">
        <Input id="contact-subject" name="subject" maxLength={140} />
      </Field>
      <Field label="Your message" htmlFor="contact-body">
        <Textarea id="contact-body" name="body" required minLength={10} rows={5} />
      </Field>
      <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">
        {pending ? "Sending…" : "Send message"}
      </Button>
      <div aria-live="polite">
        {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
      </div>
    </form>
  );
}
