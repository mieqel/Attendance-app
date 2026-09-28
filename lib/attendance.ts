// Shared rules for "hasn't shown up in a while". Used by the dashboard,
// the patients list, the patient page and the sidebar badge, so the
// numbers only need to change in one place.
export const ATTENDANCE_ALERT_DAYS = 30;
// Someone who registered but never checked in at all gets flagged sooner.
export const NEVER_CAME_ALERT_DAYS = 14;

export const ABSENCE_REASONS = [
  { key: "ziek", label: "Ziek", short: "Z" },
  { key: "vakantie", label: "Vakantie", short: "V" },
  { key: "afgemeld", label: "Afgemeld", short: "A" },
] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number]["key"];
export function isAbsenceReason(v: string): v is AbsenceReason {
  return ABSENCE_REASONS.some((r) => r.key === v);
}
export function absenceLabel(key: string): string {
  return ABSENCE_REASONS.find((r) => r.key === key)?.label ?? key;
}

const DAY_MS = 1000 * 60 * 60 * 24;

export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / DAY_MS);
}

// "YYYY-MM-DD" -> midday UTC on that day (always the same calendar day in Amsterdam).
export function dateKeyToDate(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

export type AttendanceClock = {
  // Days since the clock last "reset" (see below).
  days: number;
  // Registered, but no check-in ever.
  neverCame: boolean;
  // Should show up under "Aandacht nodig".
  overdue: boolean;
};

// The clock starts from whichever happened most recently:
//  - they registered
//  - their last check-in
//  - their last excused absence (ziek / vakantie / afgemeld — you were in contact)
//  - the end of their last pause
// Only "actief" patients can be overdue; "pauze" is expected absence.
export function attendanceClock(input: {
  status: string;
  createdAt: Date;
  lastCheckIn: Date | null;
  lastExcusedDate: string | null;
  pauseUntil: Date | null;
  now?: Date;
}): AttendanceClock {
  const now = input.now ?? new Date();
  const candidates = [input.createdAt.getTime()];
  if (input.lastCheckIn) candidates.push(input.lastCheckIn.getTime());
  if (input.lastExcusedDate) candidates.push(dateKeyToDate(input.lastExcusedDate).getTime());
  if (input.pauseUntil && input.pauseUntil.getTime() <= now.getTime()) candidates.push(input.pauseUntil.getTime());

  const start = Math.max(...candidates);
  const days = Math.max(0, Math.floor((now.getTime() - start) / DAY_MS));
  const neverCame = input.lastCheckIn === null;
  const limit = neverCame ? NEVER_CAME_ALERT_DAYS : ATTENDANCE_ALERT_DAYS;
  return { days, neverCame, overdue: input.status === "actief" && days > limit };
}

// Short Dutch sentence for the red warning line.
export function overdueText(clock: { days: number; neverCame: boolean }): string {
  return clock.neverCame
    ? `Nog nooit geweest · ${clock.days} dagen ingeschreven`
    : `${clock.days} dagen niet gezien`;
}
