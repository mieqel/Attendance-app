"use client";

import { useEffect, useState } from "react";

// Swaps [data-theme] on <html> between the default dark theme and the
// light variant defined in globals.css, and remembers the choice.
// app/layout.tsx has a matching inline script that applies the saved
// value before paint, so there's no flash of the wrong theme on load.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") setTheme("light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("theme", next);
  }

  return (
    <button
      onClick={toggle}
      className="print:hidden bg-surface-muted text-ink rounded-xl px-4 py-2 font-semibold hover:bg-border text-sm flex items-center gap-2"
      aria-label="Wissel tussen licht en donker thema"
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        </svg>
      )}
      {theme === "dark" ? "Licht" : "Donker"}
    </button>
  );
}
