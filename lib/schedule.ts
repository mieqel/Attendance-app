// The fixed weekly schedule you gave me.
// dayOfWeek follows JS convention: Sunday = 0 ... Saturday = 6

export type ScheduleEntry = {
  label: string;
  dayOfWeek: number;
  startTime: string; // "HH:MM" 24h
  endTime: string;
};

export const DAY_NAMES_NL = [
  "Zondag",
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
];

function label(dayOfWeek: number, start: string, end: string) {
  return `${DAY_NAMES_NL[dayOfWeek]} ${start} - ${end}`;
}

export const SCHEDULE: ScheduleEntry[] = [
  // Monday
  { dayOfWeek: 1, startTime: "16:00", endTime: "17:00", label: label(1, "16:00", "17:00") },
  { dayOfWeek: 1, startTime: "17:00", endTime: "18:00", label: label(1, "17:00", "18:00") },
  // Tuesday
  { dayOfWeek: 2, startTime: "16:00", endTime: "17:00", label: label(2, "16:00", "17:00") },
  { dayOfWeek: 2, startTime: "17:00", endTime: "18:00", label: label(2, "17:00", "18:00") },
  // Wednesday
  { dayOfWeek: 3, startTime: "11:00", endTime: "12:00", label: label(3, "11:00", "12:00") },
  { dayOfWeek: 3, startTime: "14:00", endTime: "15:00", label: label(3, "14:00", "15:00") },
  { dayOfWeek: 3, startTime: "15:00", endTime: "16:00", label: label(3, "15:00", "16:00") },
  // Thursday
  { dayOfWeek: 4, startTime: "16:00", endTime: "17:00", label: label(4, "16:00", "17:00") },
  { dayOfWeek: 4, startTime: "17:00", endTime: "18:00", label: label(4, "17:00", "18:00") },
  // Friday
  { dayOfWeek: 5, startTime: "14:00", endTime: "15:00", label: label(5, "14:00", "15:00") },
  // Saturday
  { dayOfWeek: 6, startTime: "10:00", endTime: "11:00", label: label(6, "10:00", "11:00") },
  { dayOfWeek: 6, startTime: "11:00", endTime: "12:00", label: label(6, "11:00", "12:00") },
  { dayOfWeek: 6, startTime: "12:00", endTime: "13:00", label: label(6, "12:00", "13:00") },
];
