import { db } from "@/lib/db";
import { getSessionUser, isStaff } from "@/lib/auth";

function csvField(value: string): string {
  // Neutralize spreadsheet formula injection (=, +, -, @ starters).
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export async function GET(): Promise<Response> {
  const user = await getSessionUser();
  if (!isStaff(user)) {
    return new Response("Not authorized.", { status: 403 });
  }

  const subscribers = await db.newsletterSubscriber.findMany({
    orderBy: { createdAt: "asc" },
  });

  const lines = [
    "email,createdAt",
    ...subscribers.map((s) => `${csvField(s.email)},${s.createdAt.toISOString()}`),
  ];
  const csv = lines.join("\r\n") + "\r\n";

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
