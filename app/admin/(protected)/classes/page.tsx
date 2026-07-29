import { prisma } from "@/lib/prisma";
import ClassesManager from "./ClassesManager";
import { getClassCapacities, getBusiestDay, getBusiestStartTime } from "@/lib/insights";

export const dynamic = "force-dynamic";

type PatientRow = {
  id: string;
  name: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  status: string;
};

export default async function ClassesPage() {
  const classesWithPatients = await prisma.classTemplate.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    include: { patients: { include: { patient: true } } },
  });

  const initialClasses = classesWithPatients.map((c: (typeof classesWithPatients)[number]) => ({
    id: c.id,
    label: c.label,
    dayOfWeek: c.dayOfWeek,
    startTime: c.startTime,
    endTime: c.endTime,
  }));

  // Roster per class for the "who's in this class" drawer — excludes
  // inactief patients the same way the kiosk roster does, and is sorted
  // by name so the drawer list reads consistently.
  const rosterByClass: Record<string, PatientRow[]> = {};
  for (const c of classesWithPatients) {
    rosterByClass[c.id] = c.patients
      .map((pc: (typeof c.patients)[number]) => pc.patient)
      .filter((p: PatientRow) => p.status !== "inactief")
      .sort((a: PatientRow, b: PatientRow) => a.name.localeCompare(b.name))
      .map((p: PatientRow) => ({
        id: p.id,
        name: p.name,
        skinTone: p.skinTone,
        hairStyle: p.hairStyle,
        hairColor: p.hairColor,
        status: p.status,
      }));
  }

  // Everyone eligible to be added to a class from the drawer's search box.
  const allPatientsRaw = await prisma.patient.findMany({
    where: { status: { not: "inactief" } },
    orderBy: { name: "asc" },
  });
  const allPatients: PatientRow[] = allPatientsRaw.map((p: (typeof allPatientsRaw)[number]) => ({
    id: p.id,
    name: p.name,
    skinTone: p.skinTone,
    hairStyle: p.hairStyle,
    hairColor: p.hairColor,
    status: p.status,
  }));

  const capacities = await getClassCapacities();
  const busiestDay = getBusiestDay(capacities);
  const busiestStartTime = getBusiestStartTime(capacities);

  // Heatmap grid: every distinct start time used anywhere in the schedule,
  // crossed with Monday..Sunday, so gaps in the week are visible at a glance.
  type Capacity = (typeof capacities)[number];
  const timeSlots: string[] = Array.from(new Set(capacities.map((c: Capacity) => c.startTime))).sort();
  const heatmap = timeSlots.map((time: string) => ({
    time,
    // dayOfWeek order Monday(1)..Saturday(6), Sunday(0) last, to read left-to-right like a week
    days: [1, 2, 3, 4, 5, 6, 0].map((dow) => capacities.some((c: Capacity) => c.dayOfWeek === dow && c.startTime === time)),
  }));

  return (
    <ClassesManager
      initialClasses={initialClasses}
      rosterByClass={rosterByClass}
      allPatients={allPatients}
      capacities={capacities.slice(0, 8)}
      busiestDay={busiestDay}
      busiestStartTime={busiestStartTime}
      heatmap={heatmap}
    />
  );
}
