"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Spinner } from "../../../Icons";
import { ABSENCE_REASONS, type AbsenceReason } from "@/lib/attendance";
import {
  getPatientAttendance,
  saveAttendanceChanges,
  type AttendanceEntry,
  type PatientAttendance,
} from "../../../actions/admin";

type ClassOption = { id: string; label: string; dayOfWeek: number; startTime: string };

type Change =
  | { kind: "addCheckIn" }
  | { kind: "removeCheckIn" }
  | { kind: "addAbsence"; reason: AbsenceReason }
  | { kind: "removeAbsence" };

const MONTHS_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];
const WEEKDAYS_NL = ["ma", "di", "wo", "do", "vr", "za", "zo"];

// "YYYY-MM-DD" for today in Amsterdam, regardless of the device's timezone.
function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function weekdayOf(dateKey: string) {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay(); // 0 = zondag
}
function shortDate(d: string) {
  return `${Number(d.slice(8))} ${MONTHS_NL[Number(d.slice(5, 7)) - 1].slice(0, 3)}`;
}
function reasonShort(key: string) {
  return ABSENCE_REASONS.find((r) => r.key === key)?.short ?? "?";
}

// Inline, tap-to-toggle attendance editor for the cliënt drawer.
//  Mode "Aanwezig": tap an empty day -> queued as present (dashed "+")
//  Mode "Afgemeld": tap an empty day -> queued as excused (ziek/vakantie/afgemeld)
//  In both modes: tap a filled day -> queued for removal; tap again -> undo.
// Nothing is saved until "Opslaan", which sends everything in one go and
// redraws in place — no page change, no reload.
export default function AttendanceCalendar({
  patientId,
  enrolledClassIds,
  classTemplates,
  onSaved,
}: {
  patientId: string;
  enrolledClassIds: string[];
  classTemplates: ClassOption[];
  onSaved: () => void;
}) {
  const today = todayKey();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7))); // 1-12
  const [data, setData] = useState<PatientAttendance | null>(null);
  const [pending, setPending] = useState<Map<string, Change>>(new Map());
  const [mode, setMode] = useState<"aanwezig" | "afgemeld">("aanwezig");
  const [reason, setReason] = useState<AbsenceReason>("ziek");
  const [classChoice, setClassChoice] = useState<string>("auto");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // (Re)load whenever a different patient's drawer opens.
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setPending(new Map());
    setMode("aanwezig");
    setError(null);
    setSaved(null);
    const t = todayKey();
    setYear(Number(t.slice(0, 4)));
    setMonth(Number(t.slice(5, 7)));
    getPatientAttendance(patientId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError("Kon de aanwezigheid niet laden.");
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const checkInsByDate = useMemo(() => {
    const m = new Map<string, AttendanceEntry[]>();
    for (const e of data?.checkIns ?? []) {
      const list = m.get(e.date) ?? [];
      list.push(e);
      m.set(e.date, list);
    }
    return m;
  }, [data]);

  const absenceByDate = useMemo(() => new Map((data?.absences ?? []).map((a) => [a.date, a.reason])), [data]);

  // Weekdays this patient normally has a class — shown as a small dot so
  // it's obvious which days they *should* have been there.
  const enrolledWeekdays = useMemo(() => {
    const s = new Set<number>();
    for (const c of classTemplates) if (enrolledClassIds.includes(c.id)) s.add(c.dayOfWeek);
    return s;
  }, [classTemplates, enrolledClassIds]);

  // Which class a queued "present" day gets booked on. "auto": the
  // patient's own class on that weekday, otherwise any class that weekday.
  function resolveClass(dateKey: string): ClassOption | null {
    if (classChoice !== "auto") return classTemplates.find((c) => c.id === classChoice) ?? null;
    const dow = weekdayOf(dateKey);
    const sameDay = classTemplates.filter((c) => c.dayOfWeek === dow);
    return sameDay.find((c) => enrolledClassIds.includes(c.id)) ?? sameDay[0] ?? null;
  }

  function toggleDay(dateKey: string) {
    if (dateKey > today || isPending || !data) return;
    setError(null);
    setSaved(null);
    setPending((prev) => {
      const next = new Map(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else if (checkInsByDate.has(dateKey)) next.set(dateKey, { kind: "removeCheckIn" });
      else if (absenceByDate.has(dateKey)) next.set(dateKey, { kind: "removeAbsence" });
      else if (mode === "aanwezig") next.set(dateKey, { kind: "addCheckIn" });
      else next.set(dateKey, { kind: "addAbsence", reason });
      return next;
    });
  }

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  const counts = { addCheckIn: 0, removeCheckIn: 0, addAbsence: 0, removeAbsence: 0 };
  pending.forEach((c) => (counts[c.kind] += 1));
  const pendingCount = pending.size;

  function save() {
    const addCheckIns: { date: string; classTemplateId: string }[] = [];
    const addAbsences: { date: string; reason: string }[] = [];
    const removeCheckInIds: string[] = [];
    const removeAbsenceDates: string[] = [];
    const unresolved: string[] = [];

    pending.forEach((c, date) => {
      if (c.kind === "addCheckIn") {
        const cls = resolveClass(date);
        if (cls) addCheckIns.push({ date, classTemplateId: cls.id });
        else unresolved.push(date);
      } else if (c.kind === "removeCheckIn") {
        removeCheckInIds.push(...(checkInsByDate.get(date) ?? []).map((e) => e.id));
      } else if (c.kind === "addAbsence") {
        addAbsences.push({ date, reason: c.reason });
      } else {
        removeAbsenceDates.push(date);
      }
    });

    if (unresolved.length > 0) {
      setError(`Geen les gevonden op ${unresolved.sort().map(shortDate).join(", ")}. Kies hieronder een les.`);
      return;
    }

    const summary = [
      counts.addCheckIn ? `${counts.addCheckIn} aanwezig` : null,
      counts.addAbsence ? `${counts.addAbsence} afgemeld` : null,
      counts.removeCheckIn + counts.removeAbsence ? `${counts.removeCheckIn + counts.removeAbsence} verwijderd` : null,
    ]
      .filter(Boolean)
      .join(", ");

    startTransition(async () => {
      const res = await saveAttendanceChanges(patientId, {
        addCheckIns,
        removeCheckInIds,
        addAbsences,
        removeAbsenceDates,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setData(res.data);
      setPending(new Map());
      setSaved(summary);
      onSaved();
    });
  }

  // ---- build the month grid (Monday first) ----
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leading = (firstDow + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`),
  ];
  const monthPrefix = `${year}-${pad(month)}`;
  const presentThisMonth = Array.from(checkInsByDate.keys()).filter((d) => d.startsWith(monthPrefix)).length;
  const excusedThisMonth = Array.from(absenceByDate.keys()).filter((d) => d.startsWith(monthPrefix)).length;
  const isCurrentMonth = monthPrefix === today.slice(0, 7);

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Aanwezigheid</div>
        {/* Mode switch: what does tapping an empty day do? */}
        <div className="flex bg-surface-muted rounded-xl p-0.5 text-xs font-semibold" role="tablist">
          {(["aanwezig", "afgemeld"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-[10px] transition-colors capitalize ${
                mode === m ? (m === "aanwezig" ? "bg-teal text-white" : "bg-ink text-bg") : "text-ink-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ${
          mode === "afgemeld" ? "grid-rows-[1fr] opacity-100 mb-2" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-ink-muted mr-1">Reden:</span>
            {ABSENCE_REASONS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setReason(r.key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-colors ${
                  reason === r.key ? "border-ink bg-ink text-bg" : "border-border text-ink-muted"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface-muted rounded-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Vorige maand"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-muted hover:bg-border hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="text-center">
            <p className="font-display font-semibold text-ink capitalize leading-tight">
              {MONTHS_NL[month - 1]} {year}
            </p>
            <p className="text-[11px] text-ink-muted">
              {data === null
                ? "laden…"
                : `${presentThisMonth} aanwezig${excusedThisMonth ? ` · ${excusedThisMonth} afgemeld` : ""}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={isCurrentMonth}
            aria-label="Volgende maand"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-muted hover:bg-border hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS_NL.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase text-ink-muted py-1">
              {d}
            </div>
          ))}
        </div>

        <div className={`grid grid-cols-7 gap-1 transition-opacity ${data === null ? "opacity-40" : ""}`}>
          {cells.map((dateKey, i) => {
            if (!dateKey) return <div key={`e${i}`} />;
            const day = Number(dateKey.slice(8));
            const attended = checkInsByDate.has(dateKey);
            const absence = absenceByDate.get(dateKey) ?? null;
            const change = pending.get(dateKey);
            const future = dateKey > today;
            const isToday = dateKey === today;
            const classDay = enrolledWeekdays.has(weekdayOf(dateKey));
            const labels = (checkInsByDate.get(dateKey) ?? []).map((e) => e.label).join(", ");

            let cls = "text-ink hover:bg-border";
            let tag: string | null = null;
            if (attended) cls = "bg-teal text-white shadow-sm";
            if (absence) { cls = "cal-absent"; tag = reasonShort(absence); }
            if (change?.kind === "removeCheckIn") cls = "cal-removing text-ink-muted line-through";
            if (change?.kind === "removeAbsence") { cls = "cal-absent line-through opacity-50"; tag = reasonShort(absence ?? ""); }
            if (change?.kind === "addCheckIn") { cls = "cal-adding border-2 border-dashed border-amber"; tag = "+"; }
            if (change?.kind === "addAbsence") { cls = "cal-absent border-2 border-dashed border-ink-muted"; tag = reasonShort(change.reason); }
            if (future) { cls = "text-ink-muted opacity-35 cursor-default"; tag = null; }

            const showDot = classDay && !attended && !absence && !change && !future;

            return (
              <button
                key={dateKey}
                type="button"
                disabled={future || data === null}
                onClick={() => toggleDay(dateKey)}
                title={attended ? labels : absence ? absence : undefined}
                aria-label={`${day} ${MONTHS_NL[month - 1]}${attended ? ", aanwezig" : absence ? `, ${absence}` : ""}`}
                className={`relative aspect-square rounded-xl text-sm font-semibold flex items-center justify-center transition-all duration-150 active:scale-90 ${cls} ${
                  isToday && !attended && !change ? "ring-2 ring-inset ring-teal" : ""
                }`}
              >
                {tag ? (
                  <span className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[9px] font-bold opacity-90">{tag}</span>
                    {day}
                  </span>
                ) : (
                  day
                )}
                {showDot && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ink-muted" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] text-ink-muted">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-teal" />aanwezig</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded cal-absent" />afgemeld (Z/V/A)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-dashed border-amber" />nog opslaan</span>
          <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-ink-muted" />lesdag</span>
        </div>
      </div>

      {/* Save bar — only appears once something is queued, so the calendar stays calm otherwise. */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ${
          pendingCount > 0 ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-2 border-amber rounded-2xl p-3 flex flex-col gap-2.5">
            {counts.addCheckIn > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <span className="text-ink-muted shrink-0">Les</span>
                <select
                  value={classChoice}
                  onChange={(e) => setClassChoice(e.target.value)}
                  className="flex-1 min-w-0 border-2 border-border rounded-xl px-2.5 py-1.5 focus:border-teal outline-none text-sm"
                >
                  <option value="auto">Automatisch (les op die weekdag)</option>
                  {classTemplates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className="bg-teal text-white rounded-xl px-4 py-2 font-semibold text-sm hover:bg-teal-dark disabled:opacity-60 flex items-center gap-2"
              >
                {isPending && <Spinner />}
                {isPending ? "Bezig..." : `Opslaan (${pendingCount})`}
              </button>
              <button
                type="button"
                onClick={() => setPending(new Map())}
                disabled={isPending}
                className="rounded-xl px-3 py-2 font-semibold text-sm text-ink-muted hover:bg-surface-muted"
              >
                Ongedaan maken
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-danger font-medium text-sm mt-2">{error}</p>}
      {saved && !error && (
        <p className="text-sm mt-2 font-medium" style={{ color: "#3fa671" }}>
          ✓ Opgeslagen — {saved}
        </p>
      )}
    </div>
  );
}
