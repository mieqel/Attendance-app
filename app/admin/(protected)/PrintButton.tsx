"use client";

// Prints just the day's class list (nav + widgets are hidden via the
// print:hidden classes on those elements) — a clean sheet for the front desk.
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden bg-surface-muted text-ink rounded-xl px-4 py-2 font-semibold hover:bg-border text-sm"
    >
      Printen
    </button>
  );
}
