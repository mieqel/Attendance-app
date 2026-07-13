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

const EMPTY_FORM = { id: null as string | null, label: "", dayOfWeek: 1, startTime: "16:00", endTime: "17:00" };

export default function ClassesManager({ initialClasses }: { initialClasses: ClassTemplate[] }) {
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

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
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
  );
}
