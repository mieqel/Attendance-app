"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addManualCheckIn, removeCheckIn, setAbsence } from "../../../../actions/admin";
import { absenceLabel } from "@/lib/attendance";
import { TrashIcon } from "../../../../Icons";
import { useToast } from "../../Toast";

type ClassOption = { id: string; label: string };

export function AddPastCheckIn({
  patientId,
  classes,
}: {
  patientId: string;
  classes: ClassOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [classTemplateId, setClassTemplateId] = useState(classes[0]?.id ?? "");
  const [dates, setDates] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateDate(index: number, value: string) {
    setDates((prev) => prev.map((d, i) => (i === index ? value : d)));
  }

  function addDateRow() {
    setDates((prev) => [...prev, ""]);
  }

  function removeDateRow(index: number) {
    setDates((prev) => prev.filter((_, i) => i !== index));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const filled = dates.filter((d) => d.trim() !== "");
    if (filled.length === 0) {
      setError("Kies minstens één datum.");
      return;
    }
    if (!classTemplateId) {
      setError("Kies een les.");
      return;
    }
    startTransition(async () => {
      const res = await addManualCheckIn(patientId, classTemplateId, filled);
      if (!res.ok) {
        setError(res.error ?? "Er ging iets mis.");
        return;
      }
      setOpen(false);
      setDates([""]);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-teal font-medium text-sm hover:text-teal-dark"
      >
        + Lessen toevoegen (gemist getikt, maar wel aanwezig)
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3"
    >
      <p className="font-display text-lg font-semibold text-ink">Aanwezigheid toevoegen</p>
      <p className="text-sm text-ink-muted -mt-1">
        Voor als iemand er echt was, maar het inchecken is gemist. Voeg meerdere dagen tegelijk toe met dezelfde les.
      </p>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-muted">Les</span>
        <select
          value={classTemplateId}
          onChange={(e) => setClassTemplateId(e.target.value)}
          className="border-2 border-border rounded-xl px-3 py-2 focus:border-teal outline-none"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-muted">Datums</span>
        {dates.map((d, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="date"
              value={d}
              onChange={(e) => updateDate(i, e.target.value)}
              className="border-2 border-border rounded-xl px-3 py-2 focus:border-teal outline-none flex-1"
            />
            {dates.length > 1 && (
              <button
                type="button"
                onClick={() => removeDateRow(i)}
                className="text-ink-muted hover:text-danger font-medium text-sm px-2"
                aria-label="Datum verwijderen"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addDateRow}
          className="text-teal font-medium text-sm text-left hover:text-teal-dark"
        >
          + Nog een dag
        </button>
      </div>

      {error && <p className="text-danger font-medium text-sm">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-teal text-white rounded-xl px-4 py-2 font-semibold hover:bg-teal-dark disabled:opacity-60"
        >
          Toevoegen
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="bg-surface-muted rounded-xl px-4 py-2 font-semibold hover:bg-border"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}

type HistoryItem = { kind: "checkIn" | "absence"; id: string; date: string; label: string };

// History rows with undo-toast removal instead of a confirm() pop-up.
export function HistoryList({ patientId, items }: { patientId: string; items: HistoryItem[] }) {
  const router = useRouter();
  const { showUndo } = useToast();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visible = items.filter((i) => !hidden.has(i.id));

  function remove(item: HistoryItem) {
    setHidden((prev) => new Set(prev).add(item.id));
    showUndo({
      message: item.kind === "checkIn" ? "Check-in verwijderd" : "Afmelding verwijderd",
      commit: async () => {
        if (item.kind === "checkIn") await removeCheckIn(item.id, patientId);
        else await setAbsence(patientId, item.date, null);
        router.refresh();
      },
      onUndo: () =>
        setHidden((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        }),
    });
  }

  return (
    <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
      {visible.length === 0 ? (
        <p className="p-6 text-ink-muted">Nog geen check-ins.</p>
      ) : (
        visible.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-4 sm:px-5 py-3 gap-3">
            <div className="min-w-0">
              <p className={`font-medium truncate ${item.kind === "absence" ? "text-ink-muted" : "text-ink"}`}>
                {item.kind === "checkIn" ? item.label : `Afgemeld · ${absenceLabel(item.label)}`}
              </p>
              <p className="text-sm text-ink-muted">
                {new Date(`${item.date}T12:00:00Z`).toLocaleDateString("nl-NL", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.kind === "checkIn" ? (
                <span className="w-7 h-7 rounded-full bg-teal text-white flex items-center justify-center text-sm" aria-label="Aanwezig">✓</span>
              ) : (
                <span className="w-7 h-7 rounded-full cal-absent flex items-center justify-center text-xs font-bold">
                  {absenceLabel(item.label).charAt(0)}
                </span>
              )}
              <button
                onClick={() => remove(item)}
                aria-label="Verwijderen"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-danger hover:bg-[var(--tint)]"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
