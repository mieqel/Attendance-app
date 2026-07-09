// The server (Vercel) runs in UTC, but the clinic runs on Europe/Amsterdam time.
// Never trust `new Date().getHours()` etc directly server-side — always go through here.

export type AmsterdamNow = {
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  minutesSinceMidnight: number;
  dateKey: string; // "YYYY-MM-DD" in Amsterdam local time, stable key for grouping sessions by day
};

const TIME_ZONE = "Europe/Amsterdam";

export function getAmsterdamNow(reference: Date = new Date()): AmsterdamNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);

  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  // hour can come back as "24" for midnight in some environments; normalize to 0
  const hour = Number(map.hour) % 24;
  const minute = Number(map.minute);

  return {
    dayOfWeek: weekdayMap[map.weekday],
    minutesSinceMidnight: hour * 60 + minute,
    dateKey: `${map.year}-${map.month}-${map.day}`,
  };
}
