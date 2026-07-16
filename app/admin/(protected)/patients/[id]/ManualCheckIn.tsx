"use client";

import { useState, useTransition } from "react";
import { addManualCheckIn, removeCheckIn } from "../../../../actions/admin";

type ClassOption = { id: string; label: string };

export function AddPastCheckIn({
  patientId,
  classes,
}: {
  patientId: string;
  classes: ClassOption[];
}) {
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
      window.location.reload();
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

export function RemoveCheckInButton({ checkInId, patientId }: { checkInId: string; patientId: string }) {
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!confirm("Deze check-in verwijderen?")) return;
    startTransition(async () => {
      await removeCheckIn(checkInId, patientId);
      window.location.reload();
    });
  }

  return (
    <button
      onClick={remove}
      disabled={isPending}
      className="text-ink-muted hover:text-danger font-medium text-sm disabled:opacity-60"
    >
      Verwijderen
    </button>
  );
}
