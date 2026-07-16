// Shared threshold for flagging a patient as "hasn't shown up in a while".
// Used by both the patients list and the patient detail page, so the
// number only needs to change in one place.
export const ATTENDANCE_ALERT_DAYS = 30;

export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// A patient is only flagged if they're "actief" — someone "op pauze" is
// expected to be absent, so their gap shouldn't trigger a check-up alert.
export function isOverdue(daysSinceLastCheckIn: number | null, status: string): boolean {
  if (status !== "actief") return false;
  if (daysSinceLastCheckIn === null) return false;
  return daysSinceLastCheckIn > ATTENDANCE_ALERT_DAYS;
}
