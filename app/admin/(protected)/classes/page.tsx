import { prisma } from "@/lib/prisma";
import ClassesManager from "./ClassesManager";
import { getClassCapacities, getBusiestDay, getBusiestStartTime } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const classes = await prisma.classTemplate.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const capacities = await getClassCapacities();
  const busiestDay = getBusiestDay(capacities);
  const busiestStartTime = getBusiestStartTime(capacities);

  // Heatmap grid: every distinct start time used anywhere in the schedule,
  // crossed with Monday..Sunday, so gaps in the week are visible at a glance.
  const timeSlots = Array.from(new Set(capacities.map((c) => c.startTime))).sort();
  const heatmap = timeSlots.map((time) => ({
    time,
    // dayOfWeek order Monday(1)..Saturday(6), Sunday(0) last, to read left-to-right like a week
    days: [1, 2, 3, 4, 5, 6, 0].map((dow) => capacities.some((c) => c.dayOfWeek === dow && c.startTime === time)),
  }));

  return (
    <ClassesManager
      initialClasses={classes}
      capacities={capacities.slice(0, 8)}
      busiestDay={busiestDay}
      busiestStartTime={busiestStartTime}
      heatmap={heatmap}
    />
  );
}
