import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { cn, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { deleteMessage, toggleMessageRead } from "./_actions";
import { DeleteMessageButton } from "./_components/delete-message-button";

export const metadata: Metadata = {
  title: "Messages",
};

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filter = sp.filter === "unread" ? "unread" : "all";

  const [messages, totalCount, unreadCount] = await Promise.all([
    db.contactMessage.findMany({
      where: filter === "unread" ? { read: false } : {},
      orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    }),
    db.contactMessage.count(),
    db.contactMessage.count({ where: { read: false } }),
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Messages"
        subtitle="Notes from the contact page. People writing here are often mid-treatment — reply gently and soon."
      />

      <div className="mb-4 flex gap-2" role="group" aria-label="Filter messages">
        <FilterChip href="/admin/messages" active={filter === "all"}>
          All <span className="tabular">({totalCount})</span>
        </FilterChip>
        <FilterChip href="/admin/messages?filter=unread" active={filter === "unread"}>
          Unread <span className="tabular">({unreadCount})</span>
        </FilterChip>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-linen bg-paper p-8 text-center">
          <p className="font-display text-lg text-ink">
            {filter === "unread" ? "No unread messages" : "No messages yet"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            {filter === "unread"
              ? "The inbox is clear — every message has been read."
              : "When someone writes through the contact page, their message lands here."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-linen rounded-[var(--radius-card)] border border-linen bg-paper">
          {messages.map((message) => (
            <li
              key={message.id}
              className={cn("px-4 py-3.5 sm:px-5", !message.read && "bg-blush/30")}
            >
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                {!message.read && (
                  <span
                    className="h-2 w-2 shrink-0 self-center rounded-full bg-rose"
                    aria-hidden="true"
                  />
                )}
                <span className={cn("text-sm text-ink", !message.read ? "font-bold" : "font-medium")}>
                  {message.name}
                  {!message.read && <span className="sr-only"> (unread)</span>}
                </span>
                <a
                  href={`mailto:${message.email}`}
                  className="text-sm text-leaf underline underline-offset-2 hover:text-fern"
                >
                  {message.email}
                </a>
                <span className="tabular ml-auto text-xs text-ink/55">
                  {formatDateTime(message.createdAt)}
                </span>
              </div>

              <details className="mt-1.5">
                <summary
                  className={cn(
                    "cursor-pointer text-sm text-ink/80 marker:text-moss hover:text-ink",
                    !message.read && "font-semibold text-ink"
                  )}
                >
                  {message.subject || "(no subject)"}
                </summary>
                <p className="mt-2 whitespace-pre-wrap border-l-2 border-petal pl-3 text-sm leading-relaxed text-ink/80">
                  {message.body}
                </p>
              </details>

              <div className="mt-2 flex items-center gap-4">
                <form action={toggleMessageRead.bind(null, message.id)}>
                  <button
                    type="submit"
                    className="text-xs font-medium text-leaf underline underline-offset-2 hover:text-fern"
                  >
                    {message.read ? "Mark unread" : "Mark read"}
                  </button>
                </form>
                <DeleteMessageButton
                  action={deleteMessage.bind(null, message.id)}
                  senderName={message.name}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-ink text-paper"
          : "border border-linen bg-paper text-ink/70 hover:border-ink/40 hover:text-ink"
      )}
    >
      {children}
    </Link>
  );
}
