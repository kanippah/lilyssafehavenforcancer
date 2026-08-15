import { redirect } from "next/navigation";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/sidebar";
import { logout } from "@/lib/actions/auth-actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!isStaff(user)) redirect("/account");
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen bg-parchment">
      <AdminSidebar storeName={settings.storeName} logoUrl={settings.logoUrl} isAdmin={user.role === "ADMIN"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-linen bg-paper px-5">
          <div className="flex items-center gap-3">
            <AdminMobileNav isAdmin={user.role === "ADMIN"} />
            <p className="hidden text-sm text-ink/60 sm:block">
              Signed in as <span className="font-semibold text-ink">{user.name}</span>
              <span className="tabular ml-2 rounded-full bg-leaf/15 px-2 py-0.5 text-xs text-pine">
                {user.role.toLowerCase()}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm font-medium text-leaf hover:underline">
              View store ↗
            </a>
            <form action={logout}>
              <button className="text-sm font-medium text-ink/60 hover:text-clay">Sign out</button>
            </form>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
