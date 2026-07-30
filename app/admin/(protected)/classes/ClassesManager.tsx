"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createClass,
  updateClass,
  deleteClass,
  addPatientToClass,
  removePatientFromClass,
} from "../../../actions/admin";
import { DAY_NAMES_NL } from "@/lib/schedule";
import AvatarSvg from "../../../AvatarSvg";
import { PencilIcon, TrashIcon, Spinner, EmptyCalendarIcon } from "../../../Icons";

type ClassTemplate = {
  id: string;
  label: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type ClassCapacity = {
  id: string;
  label: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  enrolled: number;
};

type RosterPatient = {
  id: string;
  name: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  status: string;
};

type HeatmapRow = { time: string; days: boolean[] };

const EMPTY_FORM = { id: null as string | null, label: "", dayOfWeek: 1, startTime: "16:00", endTime: "17:00" };

// Same left-to-right week order used for the heatmap columns in page.tsx
const WEEK_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const SHORT_DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

const STATUS_LABEL: Record<string, string> = { actief: "Actief", pauze: "Op pauze", inactief: "Inactief" };
const STATUS_DOT: Record<string, string> = { actief: "#1f6d3f", pauze: "#a9860a", inactief: "#8f1620" };

export default function ClassesManager({
  initialClasses,
  rosterByClass,
  allPatients,
  capacities,
  busiestDay,
  busiestStartTime,
  heatmap,
}: {
  initialClasses: ClassTemplate[];
  rosterByClass: Record<string, RosterPatient[]>;
  allPatients: RosterPatient[];
  capacities: ClassCapacity[];
  busiestDay: { label: string; total: number } | null;
  busiestStartTime: { time: string; total: number } | null;
  heatmap: HeatmapRow[];
}) {
  const [classes, setClasses] = useState(initialClasses);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  // Client-side copy of each class's roster so the drawer + card avatar
  // stack can update immediately on add/remove, without waiting on a full
  // page reload. (The "Bezetting per les" widget in the rail is a separate,
  // server-computed snapshot — same trade-off the rest of this page already
  // makes elsewhere, e.g. editing a class's day/time needs a reload too.)
  const [roster, setRoster] = useState(rosterByClass);

  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [rosterPending, startRosterTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenClassId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function startEdit(c: ClassTemplate) {
    setForm({ id: c.id, label: c.label, dayOfWeek: c.dayOfWeek, startTime: c.startTime, endTime: c.endTime });
    setShowForm(true);
    setError(null);
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = form.id
        ? await updateClass(form.id, form.label, form.dayOfWeek, form.startTime, form.endTime)
        : await createClass(form.label, form.dayOfWeek, form.startTime, form.endTime);
      if (!res.ok) {
        setError(res.error ?? "Er ging iets mis.");
        return;
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      window.location.reload();
    });
  }

  function remove(id: string) {
    if (
      !confirm(
        "Deze les verwijderen? Dit verwijdert ook alle inschrijvingen en de check-in geschiedenis voor deze les."
      )
    )
      return;
    startTransition(async () => {
      await deleteClass(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
      if (openClassId === id) setOpenClassId(null);
    });
  }

  const openClass = classes.find((c) => c.id === openClassId) ?? null;
  const openRoster = openClassId ? roster[openClassId] ?? [] : [];

  const suggestions = openClassId
    ? allPatients
        .filter((p) => !openRoster.some((r) => r.id === p.id))
        .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
        .slice(0, 8)
    : [];

  function addToOpenClass(patient: RosterPatient) {
    if (!openClassId) return;
    const classId = openClassId;
    // optimistic update
    setRoster((prev) => ({
      ...prev,
      [classId]: [...(prev[classId] ?? []), patient].sort((a, b) => a.name.localeCompare(b.name)),
    }));
    setSearch("");
    startRosterTransition(async () => {
      const res = await addPatientToClass(patient.id, classId);
      if (!res.ok) {
        // roll back on failure
        setRoster((prev) => ({ ...prev, [classId]: (prev[classId] ?? []).filter((p) => p.id !== patient.id) }));
      }
    });
  }

  function removeFromOpenClass(patientId: string) {
    if (!openClassId) return;
    const classId = openClassId;
    setRemovingId(patientId);
    setTimeout(() => {
      setRoster((prev) => ({ ...prev, [classId]: (prev[classId] ?? []).filter((p) => p.id !== patientId) }));
      setRemovingId(null);
    }, 200);
    startRosterTransition(async () => {
      await removePatientFromClass(patientId, classId);
    });
  }

  const maxEnrolled = Math.max(1, ...capacities.map((c) => c.enrolled));

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,760px)_1fr] lg:items-start">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">Lessen</h1>
            <p className="text-ink-muted text-sm mt-0.5">Klik op een les om te zien wie er ingeschreven staat</p>
          </div>
          <button
            onClick={startNew}
            className="bg-teal text-white rounded-xl px-4 py-2 font-semibold hover:bg-teal-dark"
          >
            + Nieuwe les
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink">
              {form.id ? "Les bewerken" : "Nieuwe les"}
            </h2>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-muted">Naam</span>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="border-2 border-border rounded-xl px-3 py-2 focus:border-teal outline-none"
                placeholder="bijv. Maandag 16:00 - 17:00"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-muted">Dag</span>
              <select
                value={form.dayOfWeek}
                onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
                className="border-2 border-border rounded-xl px-3 py-2 focus:border-teal outline-none"
              >
                {DAY_NAMES_NL.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-ink-muted">Starttijd</span>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="border-2 border-border rounded-xl px-3 py-2 focus:border-teal outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-ink-muted">Eindtijd</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="border-2 border-border rounded-xl px-3 py-2 focus:border-teal outline-none"
                />
              </label>
            </div>

            {error && <p className="text-danger font-medium">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="bg-teal text-white rounded-xl px-4 py-2 font-semibold hover:bg-teal-dark disabled:opacity-60 flex items-center gap-2"
              >
                {isPending && <Spinner />}
                {isPending ? "Bezig..." : "Opslaan"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-surface-muted rounded-xl px-4 py-2 font-semibold hover:bg-border"
              >
                Annuleren
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classes.map((c) => {
            const classRoster = roster[c.id] ?? [];
            const shown = classRoster.slice(0, 5);
            const extra = classRoster.length - shown.length;
            return (
              <div
                key={c.id}
                onClick={() => {
                  setOpenClassId(c.id);
                  setSearch("");
                }}
                className="group relative bg-surface border border-border rounded-2xl p-5 cursor-pointer overflow-hidden transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(191,30,46,0.10)] hover:border-teal-dark"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100" />

                <div className="flex items-start justify-between gap-2">
                  <span className="inline-block text-[11px] font-semibold text-teal-dark bg-[var(--tint)] px-2.5 py-0.5 rounded-full mb-2">
                    {DAY_NAMES_NL[c.dayOfWeek]}
                  </span>
                  <div
                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => startEdit(c)}
                      aria-label={`${c.label} bewerken`}
                      title="Bewerken"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-teal hover:bg-[var(--tint)]"
                    >
                      <PencilIcon size={15} />
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      aria-label={`${c.label} verwijderen`}
                      title="Verwijderen"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-danger hover:bg-[var(--tint)]"
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-ink text-base mb-3">{c.label}</h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {shown.map((p, i) => (
                      <div
                        key={p.id}
                        className="rounded-full border-2 border-surface overflow-hidden"
                        style={{ marginLeft: i === 0 ? 0 : -10 }}
                      >
                        <AvatarSvg skinTone={p.skinTone} hairStyle={p.hairStyle} hairColor={p.hairColor} seed={p.id} size={30} />
                      </div>
                    ))}
                    {extra > 0 && (
                      <div
                        className="w-[30px] h-[30px] rounded-full border-2 border-surface bg-surface-muted flex items-center justify-center text-[10px] font-semibold text-ink-muted flex-shrink-0"
                        style={{ marginLeft: -10 }}
                      >
                        +{extra}
                      </div>
                    )}
                    {classRoster.length === 0 && (
                      <span className="text-xs text-ink-muted italic">Nog niemand ingeschreven</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-ink-muted">
                    <b className="text-ink">{classRoster.length}</b>
                  </span>
                </div>
              </div>
            );
          })}
          {classes.length === 0 && (
            <div className="col-span-full flex flex-col items-center text-center gap-3 py-12 px-6 bg-surface border border-border rounded-2xl text-ink-muted">
              <EmptyCalendarIcon />
              <div>
                <p className="font-semibold text-ink">Nog geen lessen</p>
                <p className="text-sm mt-1">Maak je eerste les aan om cliënten te kunnen inschrijven.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Widget rail */}
      <div className="flex flex-col gap-5">
        {/* Weekoverzicht */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink text-sm mb-1">Weekoverzicht</h3>
          <p className="text-xs text-ink-muted mb-3">Welke dagen/tijden bezet zijn</p>
          {heatmap.length === 0 ? (
            <p className="text-sm text-ink-muted">Nog geen lessen ingepland.</p>
          ) : (
            <>
              <div className="grid grid-cols-[38px_repeat(7,1fr)] gap-1 mb-1">
                <span />
                {SHORT_DAY_LABELS.map((d) => (
                  <span key={d} className="text-[9px] text-center text-ink-muted font-semibold">
                    {d}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {heatmap.map((row) => (
                  <div key={row.time} className="grid grid-cols-[38px_repeat(7,1fr)] gap-1 items-center">
                    <span className="text-[9px] text-ink-muted text-right pr-1 tabular-nums">{row.time}</span>
                    {row.days.map((on, i) => (
                      <div
                        key={i}
                        title={`${SHORT_DAY_LABELS[i]} ${row.time}`}
                        className={`aspect-square rounded ${on ? "bg-amber" : "bg-surface-muted"}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-ink-muted mt-3 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber inline-block flex-shrink-0" />
                Geel = er staat een les gepland op dat tijdstip
              </p>
            </>
          )}
        </div>

        {/* Bezetting per les */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink text-sm mb-1">Bezetting per les</h3>
          <p className="text-xs text-ink-muted mb-3">Ingeschreven cliënten</p>
          {capacities.length === 0 ? (
            <p className="text-sm text-ink-muted">Nog geen lessen aangemaakt.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {capacities.map((c) => {
                const pct = Math.round((c.enrolled / maxEnrolled) * 100);
                const full = pct >= 95;
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-xs w-28 truncate" title={c.label}>
                      {c.label}
                    </span>
                    <div className="flex-1 bg-surface-muted rounded h-2 overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{ width: `${pct}%`, backgroundColor: full ? "var(--amber-dark)" : "var(--teal)" }}
                      />
                    </div>
                    <span className="text-xs text-ink-muted w-6 text-right">{c.enrolled}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drukste moment */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink text-sm mb-1">Drukste moment</h3>
          <p className="text-xs text-ink-muted mb-3">Op basis van inschrijvingen</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-surface-muted rounded-xl p-3">
              <p className="font-display text-xl font-semibold text-teal-dark leading-none">
                {busiestDay ? busiestDay.label : "–"}
              </p>
              <p className="text-[11px] text-ink-muted mt-1">
                {busiestDay ? `drukste dag (${busiestDay.total} cliënten)` : "geen data"}
              </p>
            </div>
            <div className="bg-surface-muted rounded-xl p-3">
              <p className="font-display text-xl font-semibold text-teal-dark leading-none">
                {busiestStartTime ? busiestStartTime.time : "–"}
              </p>
              <p className="text-[11px] text-ink-muted mt-1">populairste starttijd</p>
            </div>
          </div>
        </div>
      </div>

      {/* Roster drawer */}
      <div
        onClick={() => setOpenClassId(null)}
        className={`fixed inset-0 bg-[rgba(36,16,18,0.35)] z-40 transition-opacity duration-200 ${
          openClassId ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        className={`fixed top-0 right-0 bottom-0 w-[420px] max-w-[92vw] bg-surface shadow-[-8px_0_32px_rgba(36,16,18,0.18)] z-50 flex flex-col transition-transform duration-300 ease-out ${
          openClassId ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {openClass && (
          <>
            <div className="px-[22px] pt-[22px] pb-4 border-b border-border flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">{openClass.label}</h2>
                  <p className="text-sm text-ink-muted mt-0.5">
                    {DAY_NAMES_NL[openClass.dayOfWeek]} · {openClass.startTime} – {openClass.endTime}
                  </p>
                </div>
                <button
                  onClick={() => setOpenClassId(null)}
                  aria-label="Sluiten"
                  className="bg-surface-muted hover:bg-border w-8 h-8 rounded-[10px] text-ink-muted hover:text-ink flex-shrink-0"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3.5">
                <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal transition-[width] duration-300"
                    style={{ width: `${Math.min(100, Math.round((openRoster.length / Math.max(1, capacities.find((c) => c.id === openClass.id)?.enrolled || openRoster.length || 1)) * 100))}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-ink-muted whitespace-nowrap">
                  {openRoster.length} ingeschreven
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-[22px] pt-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mt-2 mb-2">
                Persoon toevoegen
              </div>
              <div className="relative mb-1.5">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Typ een naam..."
                  autoComplete="off"
                  className="w-full border-2 border-border rounded-xl px-3 py-2 focus:border-teal outline-none text-sm"
                />
                {search.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,16,18,0.14)] max-h-[260px] overflow-y-auto z-10">
                    {suggestions.length === 0 ? (
                      <div className="p-3.5 text-sm text-ink-muted text-center">Geen cliënten gevonden</div>
                    ) : (
                      suggestions.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => addToOpenClass(p)}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-muted"
                        >
                          <div className="rounded-full overflow-hidden flex-shrink-0">
                            <AvatarSvg skinTone={p.skinTone} hairStyle={p.hairStyle} hairColor={p.hairColor} seed={p.id} size={26} />
                          </div>
                          <span className="text-[13.5px] font-medium flex-1">{p.name}</span>
                          <span className="w-[22px] h-[22px] rounded-full bg-amber text-amber-dark flex items-center justify-center text-sm font-bold flex-shrink-0">
                            +
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted mt-[18px] mb-2">
                Ingeschreven ({openRoster.length})
              </div>
              <div className="flex flex-col gap-1.5 pb-5">
                {openRoster.length === 0 && (
                  <p className="text-xs text-ink-muted italic py-2">Nog niemand ingeschreven voor deze les.</p>
                )}
                {openRoster.map((p) => (
                  <div
                    key={p.id}
                    className={`group/row flex items-center gap-2.5 p-2 rounded-xl transition-all duration-200 hover:bg-surface-muted ${
                      removingId === p.id ? "opacity-0 translate-x-3.5 max-h-0 !p-0 !m-0 overflow-hidden" : "max-h-[60px]"
                    }`}
                  >
                    <div className="rounded-full overflow-hidden flex-shrink-0">
                      <AvatarSvg skinTone={p.skinTone} hairStyle={p.hairStyle} hairColor={p.hairColor} seed={p.id} size={36} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ backgroundColor: STATUS_DOT[p.status] ?? STATUS_DOT.actief }}
                        />
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFromOpenClass(p.id)}
                      aria-label={`${p.name} verwijderen`}
                      disabled={rosterPending}
                      className="w-7 h-7 rounded-lg text-ink-muted opacity-0 group-hover/row:opacity-100 hover:bg-[var(--tint)] hover:text-danger transition-opacity flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
