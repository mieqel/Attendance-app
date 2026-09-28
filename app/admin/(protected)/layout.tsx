import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { logout } from "../../actions/admin";
import { getOverduePatients, reactivateExpiredPauses } from "@/lib/insights";
import SidebarNav from "./SidebarNav";
import { ToastProvider } from "./Toast";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    redirect("/admin/login");
  }

  await reactivateExpiredPauses();
  const overdueCount = (await getOverduePatients()).length;

  const logoutIcon = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0">
      {/* Phone: slim top bar (brand + logout). The nav moves to a bottom tab bar. */}
      <header className="md:hidden print:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5 bg-surface-muted/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center text-white font-display font-semibold text-sm">
            M
          </div>
          <p className="font-display font-semibold text-sm leading-tight">Meerzicht</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Uitloggen"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-muted hover:bg-surface hover:text-danger"
          >
            {logoutIcon}
          </button>
        </form>
      </header>

      {/* Tablet/desktop: sidebar */}
      <aside className="hidden md:flex print:hidden w-[232px] shrink-0 bg-surface-muted border-r border-border flex-col gap-6 p-4">
        <div className="flex items-center gap-2.5 px-1.5">
          <div className="w-9 h-9 rounded-lg bg-teal flex items-center justify-center text-white font-display font-semibold text-base">
            M
          </div>
          <div>
            <p className="font-display font-semibold text-sm leading-tight">Meerzicht</p>
            <p className="text-[11px] text-ink-muted leading-tight">Zoetermeer</p>
          </div>
        </div>

        <SidebarNav overdueCount={overdueCount} />

        <form action={logout} className="mt-auto pt-4 border-t border-border">
          <button
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium text-sm text-ink-muted hover:bg-surface hover:text-danger"
            type="submit"
          >
            {logoutIcon}
            Uitloggen
          </button>
        </form>
      </aside>

      {/* pb-24 on phone so the last content isn't hidden behind the bottom tab bar */}
      <div className="flex-1 px-4 pt-5 pb-24 md:px-6 md:py-8 min-w-0">
        <ToastProvider>{children}</ToastProvider>
      </div>

      <SidebarNav overdueCount={overdueCount} variant="bottom" />
    </div>
  );
}
