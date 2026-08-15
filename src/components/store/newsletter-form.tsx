"use client";

import { useActionState } from "react";
import { subscribeNewsletter, type StoreActionState } from "@/lib/actions/store-actions";

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState<StoreActionState, FormData>(
    subscribeNewsletter,
    undefined
  );

  return (
    <form action={formAction} className="max-w-sm">
      <label htmlFor="newsletter-email" className="eyebrow block">
        Letters from the Haven
      </label>
      <p className="mt-1.5 text-sm text-moss">
        A short, warm note each month: what your purchases funded, and who they reached.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="h-11 w-full rounded-[var(--radius-button)] border border-moss/40 bg-ink/20 px-3.5 text-sm text-paper placeholder:text-moss/70 focus:border-petal focus:outline-none focus:ring-2 focus:ring-petal/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 rounded-[var(--radius-button)] bg-petal px-4 text-sm font-semibold text-ink transition-colors hover:bg-blush disabled:opacity-50"
        >
          {pending ? "Joining…" : "Join"}
        </button>
      </div>
      <div aria-live="polite">
        {state?.message && <p className="mt-2 text-sm text-petal">{state.message}</p>}
        {state?.error && <p className="mt-2 text-sm text-[#f0b9a8]">{state.error}</p>}
      </div>
    </form>
  );
}
