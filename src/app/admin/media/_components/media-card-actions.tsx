"use client";

import { useState, useTransition } from "react";
import { deleteMediaAsset } from "../_actions";

export function MediaCardActions({ id, url }: { id: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function copy() {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setError("Couldn't copy — select the URL manually."));
  }

  function confirmDelete() {
    startTransition(async () => {
      setError(null);
      const result = await deleteMediaAsset(id);
      if ("error" in result) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="text-xs font-medium text-leaf underline underline-offset-2 hover:text-pine"
        >
          {copied ? "Copied" : "Copy URL"}
        </button>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-xs font-medium text-ink/50 underline underline-offset-2 hover:text-clay"
          >
            Delete
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={pending}
              className="text-xs font-semibold text-clay underline underline-offset-2 disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="text-xs font-medium text-ink/50 underline underline-offset-2"
            >
              Keep
            </button>
          </>
        )}
      </div>
      <div aria-live="polite">
        {copied && <span className="sr-only">URL copied to clipboard</span>}
        {error && <p className="mt-1 text-xs font-medium text-clay">{error}</p>}
      </div>
    </div>
  );
}
