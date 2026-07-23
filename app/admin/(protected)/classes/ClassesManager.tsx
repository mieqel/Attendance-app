"use client";

import { useState, useTransition } from "react";
import { createClass, updateClass, deleteClass } from "../../../actions/admin";
import { DAY_NAMES_NL } from "@/lib/schedule";

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

type HeatmapRow = { time: string; days: boolean[] };

const EMPTY_FORM = { id: null as string | null, label: "", dayOfWeek: 1, startTime: "16:00", endTime: "17:00" };

// Same left-to-right week order used for the heatmap columns in page.tsx
const WEEK_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const SHORT_DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export default function ClassesManager({
  initialClasses,
  capacities,
  busiestDay,
  busiestStartTime,
  heatmap,
}: {
  initialClasses: ClassTemplate[];
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
    });
  }

  const maxEnrolled = Math.max(1, ...capacities.map((c) => c.enrolled));

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,640px)_1fr] lg:items-start">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold text-ink">Lessen</h1>
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
                className="bg-teal text-white rounded-xl px-4 py-2 font-semibold hover:bg-teal-dark disabled:opacity-60"
              >
                Opslaan
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

        <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {classes.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3 gap-3">
              <div>
                <p className="font-semibold text-ink">{c.label}</p>
                <p className="text-xs text-ink-muted">
                  {DAY_NAMES_NL[c.dayOfWeek]} · {c.startTime} - {c.endTime}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => startEdit(c)} className="text-ink-muted hover:text-teal font-medium">
                  Bewerken
                </button>
                <button onClick={() => remove(c.id)} className="text-ink-muted hover:text-danger font-medium">
                  Verwijderen
                </button>
              </div>
            </div>
          ))}
          {classes.length === 0 && <p className="p-6 text-ink-muted">Nog geen lessen aangemaakt.</p>}
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
              <div className="grid grid-cols-7 gap-1 mb-1">
                {SHORT_DAY_LABELS.map((d) => (
                  <span key={d} className="text-[9px] text-center text-ink-muted font-semibold">
                    {d}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {heatmap.map((row) => (
                  <div key={row.time} className="grid grid-cols-7 gap-1">
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
                        style={{ width: `${pct}%`, backgroundColor: full ? "#a9860a" : "#bf1e2e" }}
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
    </div>
  );
}
