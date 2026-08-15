"use client";

import { useActionState } from "react";
import { submitReview, type StoreActionState } from "@/lib/actions/store-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

export function ReviewForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState<StoreActionState, FormData>(
    submitReview.bind(null, productId),
    undefined
  );

  return (
    <form action={formAction} className="h-fit rounded-[var(--radius-card)] bg-parchment p-6 sm:p-7">
      <h3 className="font-display text-xl text-ink">Leave a note</h3>
      <p className="mt-1 text-sm text-ink/60">Reviews appear after a quick check by our team.</p>

      <div className="mt-5 space-y-4">
        <Field label="Rating" htmlFor="review-rating">
          <Select id="review-rating" name="rating" defaultValue="5" required>
            <option value="5">5 — Wonderful</option>
            <option value="4">4 — Good</option>
            <option value="3">3 — Okay</option>
            <option value="2">2 — Not great</option>
            <option value="1">1 — Poor</option>
          </Select>
        </Field>
        <Field label="Your name" htmlFor="review-name">
          <Input
            id="review-name"
            name="name"
            required
            minLength={2}
            autoComplete="name"
            placeholder="Shown with your review"
          />
        </Field>
        <Field label="Title (optional)" htmlFor="review-title">
          <Input id="review-title" name="title" maxLength={120} placeholder="A few words" />
        </Field>
        <Field label="Your review" htmlFor="review-body">
          <Textarea
            id="review-body"
            name="body"
            required
            minLength={10}
            placeholder="How did it hold up? Who was it for?"
          />
        </Field>
      </div>

      <Button type="submit" disabled={pending} aria-busy={pending} className="mt-5 w-full">
        {pending ? "Sending…" : "Send your review"}
      </Button>

      <div aria-live="polite" className="mt-3">
        {state?.message && <p className="text-sm font-medium text-pine">{state.message}</p>}
        {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
      </div>
    </form>
  );
}
