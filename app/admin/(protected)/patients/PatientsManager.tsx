"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import AvatarSvg from "../../../AvatarSvg";
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from "@/lib/avatar";
import { isOverdue } from "@/lib/attendance";
import {
  createPatient,
  updatePatient,
  deletePatient,
  setPatientStatus,
} from "../../../actions/admin";

type Patient = {
  id: string;
  name: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  status: string;
  createdAt: string;
  classTemplateIds: string[];
  checkInsThisWeek: number;
  checkInsThisMonth: number;
  daysSinceLastCheckIn: number | null;
};

type OverdueEntry = { id: string; name: string; days: number };
type TopAttenderEntry = { id: string; name: string; count: number };
type RecentEntry = { id: string; name: string; daysAgo: number };
type StatusCounts = { actief: number; pauze: number; inactief: number };

const STATUS_STYLES: Record<string, { text: string; bg: string; label: string }> = {
  actief: { text: "#1f6d3f", bg: "#e5f3ea", label: "Actief" },
  pauze: { text: "#8a6d0a", bg: "#fdf3d8", label: "Op pauze" },
  inactief: { text: "#8f1620", bg: "#fbe4e5", label: "Inactief" },
};

type ClassTemplate = { id: string; label: string };

const EMPTY_FORM = {
  id: null as string | null,
  name: "",
  skinTone: SKIN_TONES[2].key as string,
  hairStyle: HAIR_STYLES[1].key as string,
  hairColor: HAIR_COLORS[1].key as string,
  classIds: [] as string[],
  status: "actief" as string,
};

export default function PatientsManager({
  initialPatients,
  classTemplates,
  statusCounts,
  overduePatients,
  topAttenders,
  recentlyAdded,
}: {
  initialPatients: Patient[];
  classTemplates: ClassTemplate[];
  statusCounts: StatusCounts;
  overduePatients: OverdueEntry[];
  topAttenders: TopAttenderEntry[];
  recentlyAdded: RecentEntry[];
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
      status: p.status,
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
        ? await updatePatient(form.id, form.name, form.skinTone, form.hairStyle, form.hairColor, form.classIds, form.status)
        : await createPatient(form.name, form.skinTone, form.hairStyle, form.hairColor, form.classIds, form.status);
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

  function changeStatus(p: Patient, status: string) {
    startTransition(async () => {
      await setPatientStatus(p.id, status);
      setPatients((prev) => prev.map((x) => (x.id === p.id ? { ...x, status } : x)));
    });
  }

  const [search, setSearch] = useState("");
  const visiblePatients = patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const statusTotal = statusCounts.actief + statusCounts.pauze + statusCounts.inactief || 1;
  const donut = [
    { key: "actief", label: "actief", count: statusCounts.actief, color: "#1f6d3f" },
    { key: "pauze", label: "op pauze", count: statusCounts.pauze, color: "#f8c944" },
    { key: "inactief", label: "inactief", count: statusCounts.inactief, color: "#8f1620" },
  ];
  let cursor = 0;
  const donutSegments = donut.map((d) => {
    const pct = (d.count / statusTotal) * 100;
    const seg = { ...d, pct, offset: -cursor };
    cursor += pct;
    return seg;
  });

  const maxAttend = Math.max(1, ...topAttenders.map((t) => t.count));

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,760px)_1fr] lg:items-start">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold text-ink">Cliënten</h1>
          <button
            onClick={startNew}
            className="bg-teal text-white rounded-xl px-4 py-2 font-semibold hover:bg-teal-dark"
          >
            + Nieuwe cliënt
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam..."
          className="border-2 border-border rounded-xl px-4 py-2 focus:border-teal outline-none"
        />

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
              <div className="grid grid-cols-3 gap-2">
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
              <span className="text-sm font-medium text-ink-muted">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="border-2 border-border rounded-xl px-3 py-2 focus:border-teal outline-none"
              >
                <option value="actief">Actief</option>
                <option value="pauze">Op pauze</option>
                <option value="inactief">Inactief</option>
              </select>
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
          {visiblePatients.map((p) => {
            const overdue = isOverdue(p.daysSinceLastCheckIn, p.status);
            const s = STATUS_STYLES[p.status] ?? STATUS_STYLES.actief;
            return (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 gap-3">
                <div className="flex items-center gap-3">
                  <AvatarSvg skinTone={p.skinTone} hairStyle={p.hairStyle} hairColor={p.hairColor} seed={p.id} size={40} />
                  <div>
                    <Link
                      href={`/admin/patients/${p.id}`}
                      className={`font-semibold hover:text-teal ${overdue ? "text-danger" : "text-ink"}`}
                    >
                      {overdue && "⚠ "}
                      {p.name}
                    </Link>
                    <p className={`text-xs ${overdue ? "text-danger font-medium" : "text-ink-muted"}`}>
                      {overdue
                        ? `Niet geweest sinds ${p.daysSinceLastCheckIn} dagen`
                        : `${p.classTemplateIds.length} ${p.classTemplateIds.length === 1 ? "les" : "lessen"}`}
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
                  <select
                    value={p.status}
                    onChange={(e) => changeStatus(p, e.target.value)}
                    style={{ color: s.text, backgroundColor: s.bg }}
                    className="rounded-lg px-2 py-1 text-xs font-semibold border-none outline-none"
                  >
                    <option value="actief">Actief</option>
                    <option value="pauze">Op pauze</option>
                    <option value="inactief">Inactief</option>
                  </select>
                  <button onClick={() => startEdit(p)} className="text-ink-muted hover:text-teal font-medium">
                    Bewerken
                  </button>
                  <button onClick={() => remove(p.id)} className="text-ink-muted hover:text-danger font-medium">
                    Verwijderen
                  </button>
                </div>
              </div>
            );
          })}
          {visiblePatients.length === 0 && (
            <p className="p-6 text-ink-muted">
              {patients.length === 0 ? "Nog geen cliënten toegevoegd." : "Geen cliënten gevonden."}
            </p>
          )}
        </div>
      </div>

      {/* Widget rail */}
      <div className="flex flex-col gap-5">
        {/* Status verdeling */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink text-sm mb-1">Status verdeling</h3>
          <p className="text-xs text-ink-muted mb-3">{statusCounts.actief + statusCounts.pauze + statusCounts.inactief} cliënten totaal</p>
          <div className="flex items-center gap-4">
            <svg width="84" height="84" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#ecdfdd" strokeWidth="6" />
              {donutSegments.map((s) => (
                <circle
                  key={s.key}
                  cx="21"
                  cy="21"
                  r="15.9"
                  fill="transparent"
                  stroke={s.color}
                  strokeWidth="6"
                  strokeDasharray={`${s.pct} ${100 - s.pct}`}
                  strokeDashoffset={s.offset}
                  transform="rotate(-90 21 21)"
                />
              ))}
            </svg>
            <div className="flex flex-col gap-1.5 text-xs">
              {donutSegments.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                  {s.count} {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Aandacht nodig */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink text-sm mb-1">Aandacht nodig</h3>
          <p className="text-xs text-ink-muted mb-3">&gt; 30 dagen niet geweest</p>
          {overduePatients.length === 0 ? (
            <p className="text-sm" style={{ color: "#1f6d3f" }}>Niemand is momenteel te lang weggebleven.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {overduePatients.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span className="font-semibold text-sm text-ink">{p.name}</span>
                  <span className="text-xs font-medium" style={{ color: "#8f1620" }}>
                    {p.days} dagen
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Topaanwezigheid */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink text-sm mb-1">Topaanwezigheid</h3>
          <p className="text-xs text-ink-muted mb-3">Deze maand</p>
          {topAttenders.length === 0 ? (
            <p className="text-sm text-ink-muted">Nog geen check-ins deze maand.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {topAttenders.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2.5">
                  <span className="font-display text-xs text-ink-muted w-3">{i + 1}</span>
                  <span className="text-xs font-medium w-24 truncate">{t.name}</span>
                  <div className="flex-1 bg-surface-muted rounded h-1.5 overflow-hidden">
                    <div
                      className="bg-amber h-full rounded"
                      style={{ width: `${Math.round((t.count / maxAttend) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-muted w-4 text-right">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent toegevoegd */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink text-sm mb-1">Recent toegevoegd</h3>
          <p className="text-xs text-ink-muted mb-3">Nieuwste cliënten</p>
          {recentlyAdded.length === 0 ? (
            <p className="text-sm text-ink-muted">Nog geen cliënten.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {recentlyAdded.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-ink">{r.name}</span>
                  <span className="text-xs text-ink-muted">
                    {r.daysAgo === 0 ? "vandaag" : `${r.daysAgo} ${r.daysAgo === 1 ? "dag" : "dagen"} geleden`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
