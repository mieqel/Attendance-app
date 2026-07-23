// Shared read-only queries that power the widgets on the admin dashboard,
// clients, and classes pages. Kept separate from the page files so the
// same logic (e.g. "who's overdue") can't drift between pages.
import { prisma } from "./prisma";
import { startOfAmsterdamWeek } from "./currentClass";
import { daysSince, isOverdue } from "./attendance";
import { DAY_NAMES_NL } from "./schedule";

export type OverduePatient = { id: string; name: string; days: number };

// Active patients who haven't checked in for longer than ATTENDANCE_ALERT_DAYS.
// Same rule as the "⚠" flag on the patients list, sorted worst-first.
export async function getOverduePatients(limit?: number): Promise<OverduePatient[]> {
  const patients = await prisma.patient.findMany({
    where: { status: "actief" },
    select: {
      id: true,
      name: true,
      checkIns: { select: { checkedInAt: true }, orderBy: { checkedInAt: "desc" }, take: 1 },
    },
  });

  const overdue = patients
    .map((p) => {
      const last = p.checkIns[0]?.checkedInAt ?? null;
      const days = last ? daysSince(last) : null;
      return { id: p.id, name: p.name, days };
    })
    .filter((p): p is { id: string; name: string; days: number } => isOverdue(p.days, "actief"))
    .sort((a, b) => b.days - a.days);

  return limit ? overdue.slice(0, limit) : overdue;
}

export type StatusCounts = { actief: number; pauze: number; inactief: number };

export async function getStatusCounts(): Promise<StatusCounts> {
  const groups = await prisma.patient.groupBy({ by: ["status"], _count: { status: true } });
  const counts: StatusCounts = { actief: 0, pauze: 0, inactief: 0 };
  for (const g of groups) {
    if (g.status in counts) counts[g.status as keyof StatusCounts] = g._count.status;
  }
  return counts;
}

// Check-ins this week vs the same span last week, for the "▲/▼ vs vorige week" tile.
export async function getWeeklyCheckInTrend() {
  const weekStart = startOfAmsterdamWeek();
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);

  const [thisWeek, lastWeek] = await Promise.all([
    prisma.checkIn.count({ where: { checkedInAt: { gte: weekStart } } }),
    prisma.checkIn.count({ where: { checkedInAt: { gte: lastWeekStart, lt: weekStart } } }),
  ]);

  const changePct = lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  return { thisWeek, lastWeek, changePct };
}

export type ClassCapacity = {
  id: string;
  label: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  enrolled: number;
};

// Every recurring class with how many patients are enrolled in it,
// busiest first. Backs both the Lessen capacity bars and the busiest-day/time widgets.
export async function getClassCapacities(): Promise<ClassCapacity[]> {
  const classes = await prisma.classTemplate.findMany({
    include: { patients: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return classes
    .map((c) => ({
      id: c.id,
      label: c.label,
      dayOfWeek: c.dayOfWeek,
      startTime: c.startTime,
      endTime: c.endTime,
      enrolled: c.patients.length,
    }))
    .sort((a, b) => b.enrolled - a.enrolled);
}

export function getBusiestDay(classes: ClassCapacity[]): { label: string; total: number } | null {
  const totals = new Map<number, number>();
  for (const c of classes) totals.set(c.dayOfWeek, (totals.get(c.dayOfWeek) ?? 0) + c.enrolled);
  let best: { day: number; total: number } | null = null;
  for (const [day, total] of totals) {
    if (!best || total > best.total) best = { day, total };
  }
  return best ? { label: DAY_NAMES_NL[best.day], total: best.total } : null;
}

export function getBusiestStartTime(classes: ClassCapacity[]): { time: string; total: number } | null {
  const totals = new Map<string, number>();
  for (const c of classes) totals.set(c.startTime, (totals.get(c.startTime) ?? 0) + c.enrolled);
  let best: { time: string; total: number } | null = null;
  for (const [time, total] of totals) {
    if (!best || total > best.total) best = { time, total };
  }
  return best;
}
