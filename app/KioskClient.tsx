"use client";

import { useState, useTransition, useEffect } from "react";
import AvatarSvg from "./AvatarSvg";
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from "@/lib/avatar";
import { checkInPatient, checkOutPatient, updatePatientAppearance, registerPatient, checkInDropIn } from "./actions/kiosk";

type Patient = {
  id: string;
  name: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  checkedIn: boolean;
};

export default function KioskClient({
  classLabel,
  patients: initialPatients,
  otherPatients: initialOtherPatients,
}: {
  classLabel: string;
  patients: Patient[];
  otherPatients: Patient[];
}) {
  const [patients, setPatients] = useState(initialPatients);
  const [otherPatients, setOtherPatients] = useState(initialOtherPatients);
  const [toast, setToast] = useState<Patient | null>(null);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [registering, setRegistering] = useState(false);
  const [droppingIn, setDroppingIn] = useState(false);
  const [undoTarget, setUndoTarget] = useState<Patient | null>(null);
  const [isPending, startTransition] = useTransition();

  // one tap = checked in. no confirmation step.
  // tapping someone who's already checked in asks first — elderly users on a
  // shared tablet mis-tap often, so undoing needs to be just as easy.
  function handleTap(p: Patient) {
    if (p.checkedIn) {
      setUndoTarget(p);
      return;
    }
    setPatients((prev) => prev.map((x) => (x.id === p.id ? { ...x, checkedIn: true } : x)));
    setToast(p);
    startTransition(async () => {
      const res = await checkInPatient(p.id);
      if (!res.ok) {
        setPatients((prev) => prev.map((x) => (x.id === p.id ? { ...x, checkedIn: false } : x)));
      }
    });
  }

  // Checks someone in for a class they're not normally enrolled in. Moves
  // them from the "other patients" pool into today's visible grid so the
  // rest of the flow (undo, toast) works exactly the same as a regular tap.
  function handleDropIn(p: Patient) {
    setOtherPatients((prev) => prev.filter((x) => x.id !== p.id));
    setPatients((prev) => [...prev, { ...p, checkedIn: true }]);
    setDroppingIn(false);
    setToast(p);
    startTransition(async () => {
      const res = await checkInDropIn(p.id);
      if (!res.ok) {
        setPatients((prev) => prev.filter((x) => x.id !== p.id));
        setOtherPatients((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
      }
    });
  }

  function confirmUndo() {
    if (!undoTarget) return;
    const id = undoTarget.id;
    setPatients((prev) => prev.map((x) => (x.id === id ? { ...x, checkedIn: false } : x)));
    setUndoTarget(null);
    startTransition(async () => {
      const res = await checkOutPatient(id);
      if (!res.ok) {
        setPatients((prev) => prev.map((x) => (x.id === id ? { ...x, checkedIn: true } : x)));
      }
    });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  function saveAppearance(skinTone: string, hairStyle: string, hairColor: string) {
    if (!editing) return;
    const id = editing.id;
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, skinTone, hairStyle, hairColor } : p)));
    setEditing(null);
    startTransition(async () => {
      await updatePatientAppearance(id, skinTone, hairStyle, hairColor);
    });
  }

  return (
    <main className="flex-1 flex flex-col px-4 py-6 md:px-10 md:py-8">
      <header className="text-center mb-6 md:mb-10">
        <p className="text-sm uppercase tracking-widest text-ink-muted font-semibold mb-1">Vandaag</p>
        <h1 className="font-display text-3xl md:text-5xl font-semibold text-teal-dark">{classLabel}</h1>
        <p className="text-lg text-ink-muted mt-2">Tik één keer op jouw figuur om in te checken</p>
      </header>

      {patients.length === 0 ? (
        <p className="text-center text-xl text-ink-muted">
          Er staan nog geen deelnemers bij deze les.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto w-full">
          {patients.map((p) => (
            <div
              key={p.id}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-3xl border-2 py-6 px-3 ${
                p.checkedIn ? "bg-teal/10 border-teal" : "bg-surface border-border"
              }`}
            >
              <button
                onClick={() => setEditing(p)}
                aria-label={`Figuur wijzigen`}
                className="absolute top-2 left-2 w-8 h-8 rounded-full bg-surface-muted flex items-center justify-center text-sm"
              >
                ✎
              </button>
              {p.checkedIn && (
                <span className="absolute top-2 right-2 text-2xl" aria-label="Ingecheckt">
                  ✅
                </span>
              )}
              <button
                onClick={() => handleTap(p)}
                className="flex flex-col items-center gap-2 transition-transform active:scale-95"
              >
                <AvatarSvg
                  skinTone={p.skinTone}
                  hairStyle={p.hairStyle}
                  hairColor={p.hairColor}
                  seed={p.id}
                  size={88}
                />
                <span className="font-display text-xl md:text-2xl font-semibold text-ink text-center">
                  {p.name}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <button
          onClick={() => setRegistering(true)}
          className="bg-surface-muted hover:bg-border rounded-2xl px-5 py-3 font-semibold text-ink-muted"
        >
          Nieuw hier? Voeg jezelf toe
        </button>
        <button
          onClick={() => setDroppingIn(true)}
          className="bg-surface-muted hover:bg-border rounded-2xl px-5 py-3 font-semibold text-ink-muted"
        >
          Sta je niet op de lijst? Check hier in
        </button>
      </div>

      {toast && (
        <div className="fixed inset-x-0 top-6 flex justify-center z-50 pointer-events-none px-4">
          <div className="bg-teal text-white rounded-2xl px-6 py-4 shadow-xl flex items-center gap-3 max-w-sm">
            <AvatarSvg
              skinTone={toast.skinTone}
              hairStyle={toast.hairStyle}
              hairColor={toast.hairColor}
              seed={toast.id}
              size={48}
            />
            <p className="font-display text-lg font-semibold">Leuk dat je er bent, {toast.name}!</p>
          </div>
        </div>
      )}

      {undoTarget && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" onClick={() => setUndoTarget(null)}>
          <div
            className="bg-surface rounded-3xl p-6 flex flex-col items-center gap-4 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <AvatarSvg
              skinTone={undoTarget.skinTone}
              hairStyle={undoTarget.hairStyle}
              hairColor={undoTarget.hairColor}
              seed={undoTarget.id}
              size={80}
            />
            <p className="font-display text-xl font-semibold text-ink text-center">
              Je bent al ingecheckt
            </p>
            <p className="text-ink-muted text-center">Per ongeluk getikt?</p>
            <div className="flex flex-col gap-3 w-full mt-1">
              <button
                onClick={confirmUndo}
                disabled={isPending}
                className="w-full py-3 rounded-2xl font-semibold bg-amber text-ink hover:bg-amber-dark disabled:opacity-60"
              >
                Ja, uitchecken
              </button>
              <button
                onClick={() => setUndoTarget(null)}
                className="w-full py-3 rounded-2xl font-semibold bg-surface-muted hover:bg-border"
              >
                Nee, dit klopt
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <AppearanceEditor
          initialSkinTone={editing.skinTone}
          initialHairStyle={editing.hairStyle}
          initialHairColor={editing.hairColor}
          seed={editing.id}
          onCancel={() => setEditing(null)}
          onSave={saveAppearance}
          disabled={isPending}
        />
      )}

      {registering && (
        <RegisterModal
          onCancel={() => setRegistering(false)}
          onDone={() => {
            setRegistering(false);
            window.location.reload();
          }}
        />
      )}

      {droppingIn && (
        <DropInModal
          patients={otherPatients}
          onCancel={() => setDroppingIn(false)}
          onPick={handleDropIn}
        />
      )}
    </main>
  );
}

function DropInModal({
  patients,
  onCancel,
  onPick,
}: {
  patients: Patient[];
  onCancel: () => void;
  onPick: (p: Patient) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = patients.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div
        className="bg-surface rounded-3xl p-6 flex flex-col gap-4 max-w-md w-full shadow-xl max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-semibold text-ink text-center">Wie ben je?</h2>
        <p className="text-sm text-ink-muted text-center -mt-2">
          Je staat niet op de vaste lijst voor deze les, maar je check-in telt gewoon mee.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek je naam..."
          autoFocus
          className="w-full border-2 border-border rounded-xl px-4 py-3 text-lg text-center focus:border-teal outline-none"
        />
        <div className="overflow-y-auto flex flex-col gap-2">
          {filtered.length === 0 ? (
            <p className="text-center text-ink-muted py-4">Niemand gevonden.</p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => onPick(p)}
                className="flex items-center gap-3 rounded-2xl border-2 border-border hover:border-teal px-4 py-2 text-left"
              >
                <AvatarSvg skinTone={p.skinTone} hairStyle={p.hairStyle} hairColor={p.hairColor} seed={p.id} size={44} />
                <span className="font-display text-lg font-semibold text-ink">{p.name}</span>
              </button>
            ))
          )}
        </div>
        <button onClick={onCancel} className="w-full py-3 rounded-2xl font-semibold bg-surface-muted hover:bg-border">
          Annuleren
        </button>
      </div>
    </div>
  );
}

function AppearanceEditor({
  initialSkinTone,
  initialHairStyle,
  initialHairColor,
  seed,
  onCancel,
  onSave,
  disabled,
}: {
  initialSkinTone: string;
  initialHairStyle: string;
  initialHairColor: string;
  seed: string;
  onCancel: () => void;
  onSave: (skinTone: string, hairStyle: string, hairColor: string) => void;
  disabled: boolean;
}) {
  const [skinTone, setSkinTone] = useState(initialSkinTone);
  const [hairStyle, setHairStyle] = useState(initialHairStyle);
  const [hairColor, setHairColor] = useState(initialHairColor);

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div
        className="bg-surface rounded-3xl p-6 flex flex-col items-center gap-5 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-semibold text-ink">Jouw figuur</h2>
        <AvatarSvg skinTone={skinTone} hairStyle={hairStyle} hairColor={hairColor} seed={seed} size={100} />
        <AppearancePicker
          skinTone={skinTone}
          hairStyle={hairStyle}
          hairColor={hairColor}
          onSkinTone={setSkinTone}
          onHairStyle={setHairStyle}
          onHairColor={setHairColor}
        />
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={() => onSave(skinTone, hairStyle, hairColor)}
            disabled={disabled}
            className="flex-1 bg-teal text-white rounded-2xl py-3 font-semibold hover:bg-teal-dark disabled:opacity-60"
          >
            Opslaan
          </button>
          <button onClick={onCancel} className="flex-1 bg-surface-muted rounded-2xl py-3 font-semibold hover:bg-border">
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}

function AppearancePicker({
  skinTone,
  hairStyle,
  hairColor,
  onSkinTone,
  onHairStyle,
  onHairColor,
}: {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  onSkinTone: (v: string) => void;
  onHairStyle: (v: string) => void;
  onHairColor: (v: string) => void;
}) {
  return (
    <>
      <div className="w-full">
        <p className="text-sm font-medium text-ink-muted mb-2">Huidskleur</p>
        <div className="flex gap-2 justify-center">
          {SKIN_TONES.map((s) => (
            <button
              key={s.key}
              onClick={() => onSkinTone(s.key)}
              aria-label={s.label}
              className={`w-10 h-10 rounded-full border-2 ${skinTone === s.key ? "border-teal" : "border-border"}`}
              style={{ backgroundColor: s.hex }}
            />
          ))}
        </div>
      </div>

      <div className="w-full">
        <p className="text-sm font-medium text-ink-muted mb-2">Haar</p>
        <div className="grid grid-cols-5 gap-2">
          {HAIR_STYLES.map((h) => (
            <button
              key={h.key}
              onClick={() => onHairStyle(h.key)}
              className={`flex flex-col items-center rounded-xl border-2 py-1 ${
                hairStyle === h.key ? "border-teal bg-teal/10" : "border-border"
              }`}
            >
              <AvatarSvg skinTone={skinTone} hairStyle={h.key} hairColor={hairColor} seed={h.key} size={40} />
            </button>
          ))}
        </div>
      </div>

      <div className="w-full">
        <p className="text-sm font-medium text-ink-muted mb-2">Haarkleur</p>
        <div className="flex gap-2 justify-center">
          {HAIR_COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => onHairColor(c.key)}
              aria-label={c.label}
              className={`w-10 h-10 rounded-full border-2 ${hairColor === c.key ? "border-teal" : "border-border"}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function RegisterModal({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [skinTone, setSkinTone] = useState(SKIN_TONES[2].key as string);
  const [hairStyle, setHairStyle] = useState(HAIR_STYLES[1].key as string);
  const [hairColor, setHairColor] = useState(HAIR_COLORS[1].key as string);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await registerPatient(name, skinTone, hairStyle, hairColor);
      if (!res.ok) {
        setError(res.error ?? "Er ging iets mis.");
        return;
      }
      onDone();
    });
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50" onClick={onCancel}>
      <div
        className="bg-surface rounded-3xl p-6 flex flex-col items-center gap-5 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl font-semibold text-ink">Welkom! Hoe heet je?</h2>
        {name.trim() && (
          <AvatarSvg skinTone={skinTone} hairStyle={hairStyle} hairColor={hairColor} seed="new" size={90} />
        )}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Voornaam en achternaam"
          autoFocus
          className="w-full border-2 border-border rounded-xl px-4 py-3 text-lg text-center focus:border-teal outline-none"
        />
        <p className="text-xs text-ink-muted -mt-3 text-center">
          Je naam is voortaan zichtbaar op dit scherm, zodat je jezelf makkelijk terugvindt.
        </p>
        <AppearancePicker
          skinTone={skinTone}
          hairStyle={hairStyle}
          hairColor={hairColor}
          onSkinTone={setSkinTone}
          onHairStyle={setHairStyle}
          onHairColor={setHairColor}
        />
        {error && <p className="text-danger font-medium text-center">{error}</p>}
        <div className="flex gap-3 w-full mt-2">
          <button
            onClick={submit}
            disabled={isPending || !name.trim()}
            className="flex-1 bg-teal text-white rounded-2xl py-3 font-semibold hover:bg-teal-dark disabled:opacity-60"
          >
            Toevoegen en inchecken
          </button>
          <button onClick={onCancel} className="flex-1 bg-surface-muted rounded-2xl py-3 font-semibold hover:bg-border">
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}
