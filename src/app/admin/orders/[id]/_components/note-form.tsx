"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { NoteState } from "../_actions";

export function NoteForm({
  action,
}: {
  action: (prev: NoteState, formData: FormData) => Promise<NoteState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="order-note" className="block text-sm font-semibold text-ink">
        Add internal note
      </label>
      <Textarea
        // Remount (and clear) the field after each successful save.
        key={state?.at ?? "note"}
        id="order-note"
        name="note"
        rows={2}
        maxLength={500}
        placeholder="Only staff see these — customer called about delivery, etc."
        className="min-h-20 text-sm"
      />
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" disabled={pending}>
          {pending ? "Adding…" : "Add note"}
        </Button>
        <div aria-live="polite" className="text-xs">
          {state?.error && <p className="font-medium text-clay">{state.error}</p>}
          {state?.at && !state.error && <p className="text-pine">Note added to the timeline.</p>}
        </div>
      </div>
    </form>
  );
}
