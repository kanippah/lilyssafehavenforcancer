import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Tiny renderer for the markdown-lite used in Page and Post bodies:
 * blocks separated by blank lines, ## / ### headings, "- " list items,
 * **bold** (and *italic*) inline. Everything is rendered as JSX text
 * nodes, so content is inherently escaped — no HTML injection possible.
 */
export function PageBody({ body, className }: { body: string; className?: string }) {
  const blocks = body
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className={cn("prose-haven", className)}>
      {blocks.map((block, i) => (
        <Block key={i} text={block} />
      ))}
    </div>
  );
}

function Block({ text }: { text: string }) {
  if (text.startsWith("### ")) return <h3>{inline(text.slice(4))}</h3>;
  if (text.startsWith("## ")) return <h2>{inline(text.slice(3))}</h2>;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
    return (
      <ul>
        {lines.map((line, i) => (
          <li key={i}>{inline(line.slice(2))}</li>
        ))}
      </ul>
    );
  }

  return <p>{inline(text)}</p>;
}

/** **bold** first, then *italic* within the remaining runs. */
function inline(text: string): React.ReactNode {
  const parts = text.split("**");
  if (parts.length < 3 || parts.length % 2 === 0) return italic(text);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i}>{italic(part)}</strong>
    ) : (
      <Fragment key={i}>{italic(part)}</Fragment>
    )
  );
}

function italic(text: string): React.ReactNode {
  const parts = text.split("*");
  if (parts.length < 3 || parts.length % 2 === 0) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>
  );
}
