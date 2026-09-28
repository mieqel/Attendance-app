"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin",
    label: "Overzicht",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    href: "/admin/patients",
    label: "Cliënten",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 21c1-4 4-6 7.5-6s6.5 2 7.5 6" />
      </svg>
    ),
  },
  {
    href: "/admin/classes",
    label: "Lessen",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
        <path d="M3.5 9.5h17M8 3v3M16 3v3" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

// Desktop/tablet: vertical list inside the sidebar.
// Phone: a fixed bottom tab bar (variant="bottom") — the 232px sidebar
// ate half the screen on a phone, so below `md` it's replaced by this.
export default function SidebarNav({
  overdueCount,
  variant = "side",
}: {
  overdueCount: number;
  variant?: "side" | "bottom";
}) {
  const pathname = usePathname();

  if (variant === "bottom") {
    return (
      <nav
        className="md:hidden print:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-muted/95 backdrop-blur border-t border-border grid grid-cols-3"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {links.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                active ? "text-teal-dark" : "text-ink-muted"
              }`}
            >
              <span
                className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
                  active ? "bg-teal text-white" : ""
                }`}
              >
                <span className="w-[19px] h-[19px] [&>svg]:w-full [&>svg]:h-full">{l.icon}</span>
              </span>
              {l.label}
              {l.href === "/admin/patients" && overdueCount > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-3 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber text-[#3a2900] text-[10px] font-bold">
                  {overdueCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-wide text-ink-muted px-2.5 mb-1">Menu</p>
      {links.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium text-sm transition-colors ${
              active ? "bg-teal text-white" : "text-ink-muted hover:bg-surface-muted hover:text-ink"
            }`}
          >
            <span className="w-[17px] h-[17px] shrink-0 [&>svg]:w-full [&>svg]:h-full">{l.icon}</span>
            {l.label}
            {l.href === "/admin/patients" && overdueCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold">
                {overdueCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
