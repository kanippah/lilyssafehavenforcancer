"use client";

/**
 * Delete form with a confirm step. Receives an already-bound server action so
 * the server component stays in charge of which message is deleted.
 */
export function DeleteMessageButton({
  action,
  senderName,
}: {
  action: () => Promise<void>;
  senderName: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Delete the message from ${senderName}? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-xs font-medium text-ink/50 underline underline-offset-2 hover:text-clay"
      >
        Delete
      </button>
    </form>
  );
}
