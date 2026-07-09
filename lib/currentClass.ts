import { SCHEDULE, ScheduleEntry, DAY_NAMES_NL } from "./schedule";
import { getAmsterdamNow, AmsterdamNow } from "./time";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export type CurrentClassResult = {
  active: ScheduleEntry | null;
  next: { entry: ScheduleEntry; inMinutes: number; dayOfWeek: number } | null;
};

// Determine which scheduled class (if any) is happening right now in Amsterdam time,
// and if none, when the next one starts.
export function getCurrentClass(reference: Date = new Date()): CurrentClassResult {
  const nowInfo: AmsterdamNow = getAmsterdamNow(reference);
  const { dayOfWeek, minutesSinceMidnight } = nowInfo;

  const active = SCHEDULE.find(
    (e) =>
      e.dayOfWeek === dayOfWeek &&
      toMinutes(e.startTime) <= minutesSinceMidnight &&
      minutesSinceMidnight < toMinutes(e.endTime)
  );

  if (active) {
    return { active, next: null };
  }

  for (let offset = 0; offset <= 7; offset++) {
    const d = (dayOfWeek + offset) % 7;
    const candidates = SCHEDULE.filter((e) => e.dayOfWeek === d).sort(
      (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)
    );
    for (const c of candidates) {
      const startMinutes = toMinutes(c.startTime);
      if (offset === 0 && startMinutes <= minutesSinceMidnight) continue;
      const minutesUntil = offset * 24 * 60 + startMinutes - minutesSinceMidnight;
      return { active: null, next: { entry: c, inMinutes: minutesUntil, dayOfWeek: d } };
    }
  }

  return { active: null, next: null };
}

export function formatWait(inMinutes: number, targetDay?: number): string {
  if (inMinutes < 60) return `over ${inMinutes} minuten`;
  const hours = Math.floor(inMinutes / 60);
  const mins = inMinutes % 60;
  if (hours < 24) return mins === 0 ? `over ${hours} uur` : `over ${hours} uur en ${mins} minuten`;
  if (targetDay !== undefined) return `op ${DAY_NAMES_NL[targetDay]}`;
  return `binnenkort`;
}

export function getAmsterdamDateKey(reference: Date = new Date()): string {
  return getAmsterdamNow(reference).dateKey;
}

// Approximate boundaries (UTC midnight of the Amsterdam calendar date, which
// can be off from true Amsterdam midnight by 1-2 hours depending on DST).
// That's fine here — check-ins only ever happen during class hours, nowhere
// near midnight, so the approximation never miscounts a real check-in.
export function startOfAmsterdamWeek(reference: Date = new Date()): Date {
  const { dayOfWeek, dateKey } = getAmsterdamNow(reference);
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - daysSinceMonday));
}

export function startOfAmsterdamMonth(reference: Date = new Date()): Date {
  const { dateKey } = getAmsterdamNow(reference);
  const [y, m] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

// "YYYY-MM" in Amsterdam local time — used to bucket check-ins by month.
export function getAmsterdamMonthKey(reference: Date = new Date()): string {
  const { dateKey } = getAmsterdamNow(reference);
  return dateKey.slice(0, 7);
}
