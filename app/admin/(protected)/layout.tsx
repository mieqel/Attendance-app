import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { logout } from "../../actions/admin";
import { getOverduePatients } from "@/lib/insights";
import SidebarNav from "./SidebarNav";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    redirect("/admin/login");
  }

  const overdueCount = (await getOverduePatients()).length;

  return (
    <div className="flex-1 flex min-h-0">
      <aside className="print:hidden w-[232px] shrink-0 bg-surface-muted border-r border-border flex flex-col gap-6 p-4">
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
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            Uitloggen
          </button>
        </form>
      </aside>
      <div className="flex-1 px-6 py-8 min-w-0">{children}</div>
    </div>
  );
}
