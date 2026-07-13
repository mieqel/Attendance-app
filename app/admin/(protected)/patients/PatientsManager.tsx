"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import AvatarSvg from "../../../AvatarSvg";
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from "@/lib/avatar";
import { ATTENDANCE_ALERT_DAYS } from "@/lib/attendance";
import {
  createPatient,
  updatePatient,
  deletePatient,
  togglePatientActive,
} from "../../../actions/admin";

type Patient = {
  id: string;
  name: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  active: boolean;
  classTemplateIds: string[];
  checkInsThisWeek: number;
  checkInsThisMonth: number;
  daysSinceLastCheckIn: number | null;
};

type ClassTemplate = { id: string; label: string };

const EMPTY_FORM = {
  id: null as string | null,
  name: "",
  skinTone: SKIN_TONES[2].key as string,
  hairStyle: HAIR_STYLES[1].key as string,
  hairColor: HAIR_COLORS[1].key as string,
  classIds: [] as string[],
};

export default function PatientsManager({
  initialPatients,
  classTemplates,
}: {
  initialPatients: Patient[];
  classTemplates: ClassTemplate[];
}) {
  const [patients, setPatients] = useState(initialPatients);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function startEdit(p: Patient) {
    setForm({
      id: p.id,
      name: p.name,
      skinTone: p.skinTone,
      hairStyle: p.hairStyle,
      hairColor: p.hairColor,
      classIds: p.classTemplateIds,
    });
    setShowForm(true);
    setError(null);
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function toggleClass(id: string) {
    setForm((f) => ({
      ...f,
      classIds: f.classIds.includes(id) ? f.classIds.filter((c) => c !== id) : [...f.classIds, id],
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = form.id
        ? await updatePatient(form.id, form.name, form.skinTone, form.hairStyle, form.hairColor, form.classIds)
        : await createPatient(form.name, form.skinTone, form.hairStyle, form.hairColor, form.classIds);
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
    if (!confirm("Deze cliënt verwijderen? Dit verwijdert ook de geschiedenis.")) return;
    startTransition(async () => {
      await deletePatient(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    });
  }

  function toggleActive(p: Patient) {
    startTransition(async () => {
      await togglePatientActive(p.id, !p.active);
      setPatients((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-ink">Cliënten</h1>
        <button
          onClick={startNew}
          className="bg-teal text-white rounded-xl px-4 py-2 font-semibold hover:bg-teal-dark"
        >
          + Nieuwe cliënt
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4"
        >
          <h2 className="font-display text-xl font-semibold text-ink">
            {form.id ? "Cliënt bewerken" : "Nieuwe cliënt"}
          </h2>
          <div className="flex items-center gap-4">
            <AvatarSvg skinTone={form.skinTone} hairStyle={form.hairStyle} hairColor={form.hairColor} size={72} />
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-muted">Naam</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="border-2 border-border rounded-xl px-3 py-2 focus:border-teal outline-none"
              />
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-muted">Huidskleur</span>
            <div className="flex gap-2">
              {SKIN_TONES.map((s) => (
                <button
                  type="button"
                  key={s.key}
                  onClick={() => setForm((f) => ({ ...f, skinTone: s.key }))}
                  aria-label={s.label}
                  className={`w-9 h-9 rounded-full border-2 ${
                    form.skinTone === s.key ? "border-teal" : "border-border"
                  }`}
                  style={{ backgroundColor: s.hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-muted">Haar</span>
            <div className="grid grid-cols-5 gap-2">
              {HAIR_STYLES.map((h) => (
                <button
                  type="button"
                  key={h.key}
                  onClick={() => setForm((f) => ({ ...f, hairStyle: h.key }))}
                  className={`flex flex-col items-center rounded-xl border-2 py-1 ${
                    form.hairStyle === h.key ? "border-teal bg-teal/10" : "border-border"
                  }`}
                >
                  <AvatarSvg skinTone={form.skinTone} hairStyle={h.key} hairColor={form.hairColor} size={36} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-muted">Haarkleur</span>
            <div className="flex gap-2">
              {HAIR_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => setForm((f) => ({ ...f, hairColor: c.key }))}
                  aria-label={c.label}
                  className={`w-9 h-9 rounded-full border-2 ${
                    form.hairColor === c.key ? "border-teal" : "border-border"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-muted">Lessen</span>
            <div className="grid grid-cols-2 gap-2">
              {classTemplates.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.classIds.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
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
        {patients.map((p) => {
          const overdue = p.daysSinceLastCheckIn !== null && p.daysSinceLastCheckIn > ATTENDANCE_ALERT_DAYS;
          return (
            <div key={p.id} className="flex items-center justify-between px-5 py-3 gap-3">
              <div className="flex items-center gap-3">
                <AvatarSvg skinTone={p.skinTone} hairStyle={p.hairStyle} hairColor={p.hairColor} seed={p.id} size={40} />
                <div>
                  <Link
                    href={`/admin/patients/${p.id}`}
                    className={`font-semibold hover:text-teal ${overdue ? "text-danger" : "text-ink"}`}
                  >
                    {p.name}
                  </Link>
                  <p className={`text-xs ${overdue ? "text-danger font-medium" : "text-ink-muted"}`}>
                    {overdue
                      ? `Niet geweest sinds ${p.daysSinceLastCheckIn} dagen`
                      : `${p.classTemplateIds.length} ${p.classTemplateIds.length === 1 ? "les" : "lessen"}`}
                    {!p.active && " · inactief"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="text-right mr-2">
                  <p className="font-display text-lg font-semibold text-teal-dark leading-none">
                    {p.checkInsThisWeek}
                  </p>
                  <p className="text-[10px] text-ink-muted uppercase tracking-wide">deze week</p>
                </div>
                <div className="text-right mr-2">
                  <p className="font-display text-lg font-semibold text-teal-dark leading-none">
                    {p.checkInsThisMonth}
                  </p>
                  <p className="text-[10px] text-ink-muted uppercase tracking-wide">deze maand</p>
                </div>
                <button onClick={() => startEdit(p)} className="text-ink-muted hover:text-teal font-medium">
                  Bewerken
                </button>
                <button onClick={() => toggleActive(p)} className="text-ink-muted hover:text-amber-dark font-medium">
                  {p.active ? "Deactiveren" : "Activeren"}
                </button>
                <button onClick={() => remove(p.id)} className="text-ink-muted hover:text-danger font-medium">
                  Verwijderen
                </button>
              </div>
            </div>
          );
        })}
        {patients.length === 0 && <p className="p-6 text-ink-muted">Nog geen cliënten toegevoegd.</p>}
      </div>
    </div>
  );
}
