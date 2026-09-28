"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AvatarSvg from "../../AvatarSvg";
import { Spinner } from "../../Icons";
import { ABSENCE_REASONS } from "@/lib/attendance";
import {
  getSessionRoster,
  setSessionPresence,
  setAbsence,
  type RosterRow,
} from "../../actions/admin";

type ClassRow = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  checkedIn: number;
  enrolled: number;
};

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function niceDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

// Today's classes on Overzicht. Tap one to open the presentielijst:
// everyone enrolled, green if checked in. Tap a name to mark present /
// not present — saved instantly — or give a reason (ziek/vakantie/afgemeld).
// The arrows step a week back, to fix last week's same class.
export default function TodayClasses({ rows, today }: { rows: ClassRow[]; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<ClassRow | null>(null);
  const [date, setDate] = useState(today);
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRoster(null);
    setError(null);
    getSessionRoster(open.id, date)
      .then((r) => !cancelled && setRoster(r))
      .catch(() => !cancelled && setError("Kon de lijst niet laden."));
    return () => {
      cancelled = true;
    };
  }, [open, date]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function openClass(row: ClassRow) {
    setDate(today);
    setOpen(row);
  }

  function close() {
    setOpen(null);
    // Update the "x / y ingecheckt" numbers on the page behind it.
    if (dirty) router.refresh();
    setDirty(false);
  }

  function markBusy(id: string, on: boolean) {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function run(patientId: string, optimistic: (r: RosterRow) => RosterRow, action: () => Promise<{ ok: boolean }>) {
    const before = roster;
    setRoster((prev) => prev?.map((r) => (r.patientId === patientId ? optimistic(r) : r)) ?? prev);
    markBusy(patientId, true);
    try {
      const res = await action();
      if (!res.ok) throw new Error();
      setDirty(true);
    } catch {
      setRoster(before);
      setError("Opslaan mislukt, probeer het opnieuw.");
    } finally {
      markBusy(patientId, false);
    }
  }

  function togglePresent(r: RosterRow) {
    if (!open) return;
    const present = !r.present;
    void run(
      r.patientId,
      (x) => ({ ...x, present, absence: present ? null : x.absence }),
      () => setSessionPresence(r.patientId, open.id, date, present)
    );
  }

  function toggleReason(r: RosterRow, reason: string) {
    if (!open) return;
    const next = r.absence === reason ? null : reason;
    void run(
      r.patientId,
      (x) => ({ ...x, absence: next }),
      () => setAbsence(r.patientId, date, next, open.id)
    );
  }

  const presentCount = roster?.filter((r) => r.present).length ?? 0;
  const total = roster?.length ?? 0;
  const pct = total ? Math.round((presentCount / total) * 100) : 0;

  return (
    <>
      <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-ink-muted">Vandaag zijn er geen lessen.</p>
        ) : (
          rows.map((row) => (
            <button
              key={row.id}
              onClick={() => openClass(row)}
              className="w-full flex items-center justify-between px-4 md:px-6 py-4 text-left hover:bg-surface-muted transition-colors group"
            >
              <div>
                <p className="font-semibold text-ink">
                  {row.startTime} - {row.endTime}
                </p>
                <p className="text-xs text-ink-muted mt-0.5 group-hover:text-teal-dark">Presentielijst openen →</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-semibold text-teal-dark">
                  {row.checkedIn} / {row.enrolled}
                </p>
                <p className="text-xs text-ink-muted uppercase tracking-wide">ingecheckt</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Drawer */}
      <div
        onClick={close}
        className={`fixed inset-0 bg-[rgba(36,16,18,0.35)] z-40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        role="dialog"
        aria-label="Presentielijst"
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-surface shadow-[-8px_0_32px_rgba(36,16,18,0.18)] z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {open && (
          <>
            <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-ink-muted font-semibold">Presentielijst</p>
                  <p className="font-display text-xl font-semibold text-ink">
                    {open.startTime} – {open.endTime}
                  </p>
                </div>
                <button
                  onClick={close}
                  aria-label="Sluiten"
                  className="bg-surface-muted hover:bg-border w-9 h-9 rounded-[10px] text-ink-muted hover:text-ink flex-shrink-0"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between mt-3 bg-surface-muted rounded-xl p-1">
                <button
                  onClick={() => setDate((d) => addDays(d, -7))}
                  aria-label="Week eerder"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-muted hover:bg-border hover:text-ink"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold text-ink capitalize">{niceDate(date)}</p>
                  {date !== today && (
                    <button onClick={() => setDate(today)} className="text-[11px] text-teal-dark font-medium hover:underline">
                      terug naar vandaag
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setDate((d) => addDays(d, 7))}
                  disabled={addDays(date, 7) > today}
                  aria-label="Week later"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-muted hover:bg-border hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink-muted">
                    <span className="font-semibold text-ink">{presentCount}</span> van {total} aanwezig
                  </span>
                  <span className="text-ink-muted">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full bg-teal rounded-full transition-[width] duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2">
              {error && <p className="text-danger text-sm font-medium px-2 py-2">{error}</p>}
              {roster === null ? (
                <div className="flex justify-center py-10 text-ink-muted">
                  <Spinner />
                </div>
              ) : roster.length === 0 ? (
                <p className="text-ink-muted text-sm px-2 py-8 text-center">Niemand ingeschreven voor deze les.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {roster.map((r) => (
                    <li
                      key={r.patientId}
                      className={`rounded-2xl px-2 py-2 transition-colors ${r.present ? "tint-teal" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <AvatarSvg skinTone={r.skinTone} hairStyle={r.hairStyle} hairColor={r.hairColor} seed={r.patientId} size={40} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ink truncate">{r.name}</p>
                          <p className="text-[11px] text-ink-muted">
                            {r.present
                              ? "Aanwezig"
                              : r.absence
                                ? `Afgemeld · ${ABSENCE_REASONS.find((x) => x.key === r.absence)?.label}`
                                : "Niet ingecheckt"}
                            {!r.enrolled && " · drop-in"}
                            {r.status === "pauze" && " · op pauze"}
                          </p>
                        </div>
                        <button
                          onClick={() => togglePresent(r)}
                          disabled={busy.has(r.patientId)}
                          aria-pressed={r.present}
                          aria-label={r.present ? `${r.name} afwezig melden` : `${r.name} aanwezig melden`}
                          className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                            r.present ? "bg-teal text-white shadow-sm" : "border-2 border-border text-ink-muted hover:border-teal"
                          }`}
                        >
                          {busy.has(r.patientId) ? (
                            <Spinner />
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {!r.present && (
                        <div className="flex gap-1.5 mt-2 ml-[52px]">
                          {ABSENCE_REASONS.map((reason) => (
                            <button
                              key={reason.key}
                              onClick={() => toggleReason(r, reason.key)}
                              disabled={busy.has(r.patientId)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                                r.absence === reason.key
                                  ? "bg-ink text-bg border-ink"
                                  : "border-border text-ink-muted hover:text-ink"
                              }`}
                            >
                              {reason.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-5 py-3 border-t border-border text-[11px] text-ink-muted flex-shrink-0">
              Wijzigingen worden direct opgeslagen.
            </div>
          </>
        )}
      </div>
    </>
  );
}
