import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { changeUserRole, inviteStaff, promoteToStaff } from "./_actions";

export const metadata: Metadata = {
  title: "Staff",
};

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();

  if (!user || !isAdmin(user)) {
    return (
      <div>
        <PageHeader title="Staff" />
        <div className="rounded-[var(--radius-card)] border border-linen bg-paper p-8 text-center">
          <p className="font-display text-lg text-ink">Only the admin can manage staff</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
            Staff accounts, roles, and invitations are managed by the store admin. If you need a
            role change, ask them directly.
          </p>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const message = typeof sp.message === "string" ? sp.message : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const [staff, customers] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    }),
    q
      ? db.user.findMany({
          where: { role: "CUSTOMER", email: { contains: q, mode: "insensitive" } },
          orderBy: { createdAt: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Staff"
        subtitle="Who can open this admin, and what they are allowed to do."
      />

      <div aria-live="polite">
        {message && (
          <p className="mb-4 rounded-[var(--radius-button)] border border-leaf/30 bg-leaf/10 px-4 py-2.5 text-sm font-medium text-pine">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-[var(--radius-button)] border border-clay/30 bg-clay/10 px-4 py-2.5 text-sm font-medium text-clay">
            {error}
          </p>
        )}
      </div>

      <section className="rounded-[var(--radius-card)] border border-linen bg-paper p-5">
        <h2 className="font-display text-lg text-ink">Current team</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Change role</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td className="font-medium text-ink">
                    {member.name}
                    {member.id === user.id && <span className="ml-1.5 text-xs text-ink/50">(you)</span>}
                  </td>
                  <td>{member.email}</td>
                  <td>
                    <Badge tone={member.role === "ADMIN" ? "rose" : "green"}>
                      {member.role.toLowerCase()}
                    </Badge>
                  </td>
                  <td className="tabular text-ink/70">{formatDate(member.createdAt)}</td>
                  <td>
                    <form
                      action={changeUserRole.bind(null, member.id)}
                      className="flex items-center gap-2"
                    >
                      <select
                        name="role"
                        defaultValue={member.role}
                        aria-label={`Change role for ${member.name}`}
                        className="h-9 rounded-[var(--radius-button)] border border-linen bg-white/70 px-2 text-sm text-ink focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/25"
                      >
                        <option value="CUSTOMER">customer</option>
                        <option value="STAFF">staff</option>
                        <option value="ADMIN">admin</option>
                      </select>
                      <Button type="submit" variant="outline" size="sm">
                        Update
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/55">
          The store always keeps at least one admin — the last admin can&apos;t be demoted.
        </p>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[var(--radius-card)] border border-linen bg-paper p-5">
          <h2 className="font-display text-lg text-ink">Invite staff</h2>
          <p className="mt-1 text-sm text-ink/60">
            Creates a staff account with a temporary password. Share the credentials securely — in
            person or through a password manager, not by email — and ask them to change the password
            after first sign-in.
          </p>
          <form action={inviteStaff} className="mt-4 space-y-4">
            <Field label="Name" htmlFor="invite-name">
              <Input id="invite-name" name="name" required autoComplete="off" />
            </Field>
            <Field label="Email" htmlFor="invite-email">
              <Input id="invite-email" name="email" type="email" required autoComplete="off" />
            </Field>
            <Field
              label="Temporary password"
              htmlFor="invite-password"
              hint="At least 8 characters. Shown in plain text so you can copy it."
            >
              <Input
                id="invite-password"
                name="password"
                type="text"
                required
                minLength={8}
                autoComplete="off"
                className="tabular"
              />
            </Field>
            <Button type="submit">Create staff account</Button>
          </form>
        </section>

        <section className="rounded-[var(--radius-card)] border border-linen bg-paper p-5">
          <h2 className="font-display text-lg text-ink">Promote a customer</h2>
          <p className="mt-1 text-sm text-ink/60">
            Already shopping with you? Find their account by email and give them staff access.
          </p>
          <form method="get" action="/admin/staff" className="mt-4 flex gap-2">
            <label htmlFor="customer-search" className="sr-only">
              Search customers by email
            </label>
            <Input
              id="customer-search"
              name="q"
              type="search"
              placeholder="Search customers by email"
              defaultValue={q}
            />
            <Button type="submit" variant="outline" className="shrink-0">
              Search
            </Button>
          </form>

          {q &&
            (customers.length === 0 ? (
              <p className="mt-4 text-sm text-ink/60">
                No customers match that email. Check the spelling, or invite them as new staff
                instead.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-linen">
                {customers.map((customer) => (
                  <li key={customer.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{customer.name}</p>
                      <p className="truncate text-xs text-ink/60">
                        {customer.email} · joined{" "}
                        <span className="tabular">{formatDate(customer.createdAt)}</span>
                      </p>
                    </div>
                    <form action={promoteToStaff.bind(null, customer.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        Promote to staff
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            ))}
        </section>
      </div>
    </div>
  );
}
