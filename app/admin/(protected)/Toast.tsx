"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// Undo toasts instead of confirm() pop-ups.
//
// Pattern: the screen hides/changes the item straight away, then calls
// showUndo({ commit, onUndo }). The real server call (commit) only runs
// after the toast times out. "Ongedaan maken" cancels it and onUndo puts
// the item back. If another undo toast comes in, or the page is closed,
// the pending one is committed immediately so nothing gets lost.

type UndoOptions = {
  message: string;
  commit: () => Promise<unknown> | void;
  onUndo?: () => void;
  duration?: number;
};

type ToastState = { id: number; message: string; undoable: boolean; tone: "default" | "error"; duration: number };

type Ctx = {
  showUndo: (o: UndoOptions) => void;
  showToast: (message: string, tone?: "default" | "error") => void;
};

const ToastContext = createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const pending = useRef<{ commit: UndoOptions["commit"]; onUndo?: () => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const showToast = useCallback((message: string, tone: "default" | "error" = "default") => {
    const id = ++seq.current;
    setToast({ id, message, undoable: false, tone, duration: 3000 });
    clearTimer();
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3000);
  }, []);

  const runCommit = useCallback(
    async (p: { commit: UndoOptions["commit"]; onUndo?: () => void }) => {
      try {
        await p.commit();
      } catch {
        p.onUndo?.();
        showToast("Opslaan mislukt — probeer het opnieuw.", "error");
      }
    },
    [showToast]
  );

  const flush = useCallback(() => {
    const p = pending.current;
    pending.current = null;
    clearTimer();
    if (p) void runCommit(p);
  }, [runCommit]);

  const showUndo = useCallback(
    ({ message, commit, onUndo, duration = 5000 }: UndoOptions) => {
      flush();
      const id = ++seq.current;
      pending.current = { commit, onUndo };
      setToast({ id, message, undoable: true, tone: "default", duration });
      timer.current = setTimeout(() => {
        const p = pending.current;
        pending.current = null;
        setToast((t) => (t?.id === id ? null : t));
        if (p) void runCommit(p);
      }, duration);
    },
    [flush, runCommit]
  );

  function undo() {
    const p = pending.current;
    pending.current = null;
    clearTimer();
    setToast(null);
    p?.onUndo?.();
  }

  // Closing the tab or navigating away still saves what the user did.
  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  return (
    <ToastContext.Provider value={{ showUndo, showToast }}>
      {children}
      <div
        aria-live="polite"
        className="print:hidden fixed inset-x-0 bottom-[88px] md:bottom-6 z-[60] flex justify-center px-4 pointer-events-none"
      >
        {toast && (
          <div
            key={toast.id}
            className={`toast-in pointer-events-auto relative overflow-hidden w-full max-w-sm rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.35)] flex items-center gap-3 pl-4 pr-2 py-2.5 ${
              toast.tone === "error" ? "bg-danger text-white" : "toast-surface"
            }`}
          >
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            {toast.undoable && (
              <button
                onClick={undo}
                className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-bold text-[#f8c944] hover:bg-[rgba(255,255,255,0.08)]"
              >
                Ongedaan maken
              </button>
            )}
            {toast.undoable && (
              <span
                className="toast-bar absolute left-0 bottom-0 h-[3px] bg-[#f8c944]"
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
