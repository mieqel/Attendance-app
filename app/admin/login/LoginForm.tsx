"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../actions/admin";

export default function LoginForm() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  function submit(value: string) {
    setError(null);
    startTransition(async () => {
      const res = await login(value);
      if (!res.ok) {
        setError(res.error ?? "Inloggen mislukt.");
        setPin("");
        return;
      }
      router.push("/admin");
      router.refresh();
    });
  }

  function appendDigit(d: string) {
    if (isPending) return;
    setError(null);
    setPin((prev) => (prev + d).slice(0, 4));
  }

  function backspace() {
    setPin((prev) => prev.slice(0, -1));
  }

  useEffect(() => {
    hiddenInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (pin.length === 4) {
      submit(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xs">
      <input
        ref={hiddenInputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
          setPin(digits);
        }}
        className="sr-only"
        aria-label="Pincode"
      />

      <div className="flex gap-3" onClick={() => hiddenInputRef.current?.focus()}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-display font-semibold ${
              pin.length > i ? "border-teal bg-teal/10 text-teal-dark" : "border-border bg-surface text-ink"
            }`}
          >
            {pin[i] ? "•" : ""}
          </div>
        ))}
      </div>

      {error && <p className="text-danger text-sm font-medium">{error}</p>}

      <div className="grid grid-cols-3 gap-3 w-full">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => appendDigit(d)}
            disabled={isPending}
            className="bg-surface border-2 border-border rounded-xl py-4 text-xl font-semibold text-ink hover:border-teal disabled:opacity-60"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={backspace}
          disabled={isPending}
          className="bg-surface-muted rounded-xl py-4 text-lg font-semibold text-ink-muted hover:bg-border disabled:opacity-60"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={() => appendDigit("0")}
          disabled={isPending}
          className="bg-surface border-2 border-border rounded-xl py-4 text-xl font-semibold text-ink hover:border-teal disabled:opacity-60"
        >
          0
        </button>
        <div />
      </div>
    </div>
  );
}
