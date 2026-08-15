"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ImageUploader } from "@/components/admin/image-uploader";
import { slugify } from "@/lib/utils";
import type { CollectionFormState } from "../_actions";

export type CollectionFormInitial = {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  position: number;
};

export function CollectionForm({
  action,
  deleteAction,
  initial,
}: {
  action: (state: CollectionFormState, formData: FormData) => Promise<CollectionFormState>;
  deleteAction?: () => Promise<{ error: string } | void>;
  initial?: CollectionFormInitial;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="space-y-4 rounded-[var(--radius-card)] border border-linen bg-paper p-5"
      >
        <Field label="Title" htmlFor="collection-title">
          <Input
            id="collection-title"
            name="title"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Comfort goods"
          />
        </Field>
        <Field
          label="Slug"
          htmlFor="collection-slug"
          hint="Used in the collection's web address, e.g. /collections/comfort-goods."
        >
          <Input
            id="collection-slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="tabular"
          />
        </Field>
        <Field label="Description" htmlFor="collection-description">
          <Textarea
            id="collection-description"
            name="description"
            defaultValue={initial?.description ?? ""}
            placeholder="A sentence or two shown at the top of the collection page."
          />
        </Field>
        <Field label="Image" hint="Shown on the collection card in the store.">
          <ImageUploader name="imageUrl" initialUrl={initial?.imageUrl} label="Upload image" />
        </Field>
        <Field label="Position" htmlFor="collection-position" hint="Lower numbers appear first.">
          <Input
            id="collection-position"
            name="position"
            type="number"
            min={0}
            step={1}
            defaultValue={initial?.position ?? 0}
            className="tabular w-28"
          />
        </Field>

        <div aria-live="polite">
          {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
        </div>
        <div className="flex items-center gap-4">
          <Button disabled={pending} aria-busy={pending}>
            {pending ? "Saving…" : initial ? "Save collection" : "Create collection"}
          </Button>
          <Link href="/admin/collections" className="text-sm font-medium text-ink/60 hover:text-ink">
            Cancel
          </Link>
        </div>
      </form>

      {deleteAction && (
        <section className="space-y-3 rounded-[var(--radius-card)] border border-clay/30 bg-paper p-5">
          <h2 className="font-display text-lg text-ink">Danger area</h2>
          <p className="text-sm text-ink/60">
            Deleting removes this collection. The products in it stay in the store — they just leave the
            group.
          </p>
          <div className="flex items-center gap-3">
            {!confirmingDelete ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(true)}>
                Delete this collection…
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={deleting}
                  aria-busy={deleting}
                  onClick={() =>
                    startDelete(async () => {
                      setDeleteError(null);
                      const result = await deleteAction();
                      if (result && "error" in result) setDeleteError(result.error);
                    })
                  }
                >
                  {deleting ? "Deleting…" : "Yes, delete permanently"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Keep it
                </Button>
              </>
            )}
          </div>
          <div aria-live="polite">
            {deleteError && <p className="text-sm font-medium text-clay">{deleteError}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
