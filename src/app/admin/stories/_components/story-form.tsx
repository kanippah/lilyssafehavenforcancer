"use client";

import { useActionState, useState } from "react";
import type { Post } from "@prisma/client";
import { formatDate, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ImageUploader } from "@/components/admin/image-uploader";
import { deleteStory, saveStory, type StoryFormState } from "../_actions";

export function StoryForm({ post }: { post?: Post }) {
  const [state, formAction, pending] = useActionState<StoryFormState, FormData>(
    saveStory.bind(null, post?.id ?? null),
    undefined
  );

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  // Once someone edits the slug by hand (or the story already exists), stop auto-generating.
  const [slugEdited, setSlugEdited] = useState(Boolean(post));

  const published = post?.publishedAt ?? null;

  return (
    <div className="max-w-3xl space-y-4">
      <form action={formAction} className="space-y-4">
        <section className="rounded-[var(--radius-card)] border border-linen bg-paper p-5">
          <div className="space-y-4">
            <Field label="Title" htmlFor="story-title">
              <Input
                id="story-title"
                name="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugEdited) setSlug(slugify(e.target.value));
                }}
                required
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="story-slug"
              hint={`Web address: /stories/${slug || "…"}`}
            >
              <Input
                id="story-slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(true);
                }}
                className="tabular"
              />
            </Field>
            <Field
              label="Excerpt"
              htmlFor="story-excerpt"
              hint="A sentence or two shown in story lists and previews."
            >
              <Textarea
                id="story-excerpt"
                name="excerpt"
                rows={2}
                defaultValue={post?.excerpt ?? ""}
              />
            </Field>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-ink">Cover image</p>
              <ImageUploader
                name="coverUrl"
                initialUrl={post?.coverUrl}
                label="Upload cover"
                previewClassName="h-24 w-40"
              />
            </div>
            <Field
              label="Body"
              htmlFor="story-body"
              hint="Blank line between paragraphs. ## for headings, - for list items, **bold**, *italic*."
            >
              <Textarea
                id="story-body"
                name="body"
                rows={18}
                defaultValue={post?.body ?? ""}
                className="font-mono text-sm leading-relaxed"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] border border-linen bg-paper p-5">
          <h2 className="font-display text-lg text-ink">Publishing</h2>
          {published ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-ink/70">
                Published <span className="tabular">{formatDate(published)}</span> — it&apos;s live
                on the storefront.
              </p>
              <div className="flex items-start gap-2.5">
                <input
                  id="story-unpublish"
                  name="unpublish"
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--color-leaf)]"
                />
                <label htmlFor="story-unpublish" className="text-sm text-ink">
                  <span className="font-semibold">Unpublish</span>
                  <span className="block text-xs text-ink/55">
                    Takes it off the storefront and returns it to draft.
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2.5">
              <input
                id="story-publish"
                name="publishNow"
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[var(--color-leaf)]"
              />
              <label htmlFor="story-publish" className="text-sm text-ink">
                <span className="font-semibold">Publish now</span>
                <span className="block text-xs text-ink/55">
                  Leave unchecked to keep it as a draft only staff can see.
                </span>
              </label>
            </div>
          )}
        </section>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Saving…" : "Save story"}
          </Button>
          <div aria-live="polite">
            {state?.message && <p className="text-sm font-medium text-pine">{state.message}</p>}
            {state?.error && <p className="text-sm font-medium text-clay">{state.error}</p>}
          </div>
        </div>
      </form>

      {post && (
        <form
          action={deleteStory.bind(null, post.id)}
          onSubmit={(e) => {
            if (!window.confirm(`Delete "${post.title}"? This can't be undone.`)) {
              e.preventDefault();
            }
          }}
          className="border-t border-linen pt-4"
        >
          <button
            type="submit"
            className="text-sm font-medium text-ink/50 underline underline-offset-2 hover:text-clay"
          >
            Delete this story
          </button>
        </form>
      )}
    </div>
  );
}
