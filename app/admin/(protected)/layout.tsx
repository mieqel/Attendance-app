import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/auth";
import { logout } from "../../actions/admin";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    redirect("/admin/login");
  }

  return (
    <div className="flex-1 flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
        <div className="flex items-center gap-6">
          <span className="font-display text-xl font-semibold text-teal-dark">Beheer</span>
          <Link href="/admin" className="text-ink-muted hover:text-teal font-medium">
            Overzicht
          </Link>
          <Link href="/admin/patients" className="text-ink-muted hover:text-teal font-medium">
            Cliënten
          </Link>
        </div>
        <form action={logout}>
          <button className="text-ink-muted hover:text-danger font-medium" type="submit">
            Uitloggen
          </button>
        </form>
      </nav>
      <div className="flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
