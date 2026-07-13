// Shared threshold for flagging a patient as "hasn't shown up in a while".
// Used by both the patients list and the patient detail page, so the
// number only needs to change in one place.
export const ATTENDANCE_ALERT_DAYS = 30;

export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}
