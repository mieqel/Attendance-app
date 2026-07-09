import { getAmsterdamNow } from "./time";

export const MONTH_NAMES_NL_SHORT = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

export type MonthCell = { key: string; label: string };

// Returns the trailing `count` months (oldest first, current month last) as
// "YYYY-MM" keys with short Dutch labels, e.g. { key: "2026-07", label: "jul 2026" }
export function getLastNMonths(count: number, reference: Date = new Date()): MonthCell[] {
  const { dateKey } = getAmsterdamNow(reference);
  const [y, m] = dateKey.split("-").map(Number);
  const months: MonthCell[] = [];
  for (let i = count - 1; i >= 0; i--) {
    let year = y;
    let month = m - i;
    while (month <= 0) {
      month += 12;
      year -= 1;
    }
    const key = `${year}-${String(month).padStart(2, "0")}`;
    months.push({ key, label: `${MONTH_NAMES_NL_SHORT[month - 1]} ${year}` });
  }
  return months;
}
