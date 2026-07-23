import { prisma } from "@/lib/prisma";
import { startOfAmsterdamWeek, startOfAmsterdamMonth } from "@/lib/currentClass";
import { daysSince, isOverdue } from "@/lib/attendance";
import PatientsManager from "./PatientsManager";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const [patients, classTemplates] = await Promise.all([
    prisma.patient.findMany({
      include: {
        classes: { include: { classTemplate: true } },
        checkIns: { select: { checkedInAt: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.classTemplate.findMany({
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
  ]);

  const weekStart = startOfAmsterdamWeek();
  const monthStart = startOfAmsterdamMonth();

  const patientsForClient = patients.map((p) => {
    const lastCheckIn = p.checkIns.length
      ? p.checkIns.reduce((latest, c) => (c.checkedInAt > latest ? c.checkedInAt : latest), p.checkIns[0].checkedInAt)
      : null;

    return {
      id: p.id,
      name: p.name,
      skinTone: p.skinTone,
      hairStyle: p.hairStyle,
      hairColor: p.hairColor,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      classTemplateIds: p.classes.map((c) => c.classTemplateId),
      checkInsThisWeek: p.checkIns.filter((c) => c.checkedInAt >= weekStart).length,
      checkInsThisMonth: p.checkIns.filter((c) => c.checkedInAt >= monthStart).length,
      daysSinceLastCheckIn: lastCheckIn ? daysSince(lastCheckIn) : null,
    };
  });

  // ---- widget data, derived from the same fetch (no extra DB round trips) ----
  const statusCounts = { actief: 0, pauze: 0, inactief: 0 } as Record<string, number>;
  for (const p of patientsForClient) {
    if (p.status in statusCounts) statusCounts[p.status] += 1;
  }

  const overduePatients = patientsForClient
    .filter((p) => isOverdue(p.daysSinceLastCheckIn, p.status))
    .sort((a, b) => (b.daysSinceLastCheckIn ?? 0) - (a.daysSinceLastCheckIn ?? 0))
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name, days: p.daysSinceLastCheckIn ?? 0 }));

  const topAttenders = [...patientsForClient]
    .filter((p) => p.checkInsThisMonth > 0)
    .sort((a, b) => b.checkInsThisMonth - a.checkInsThisMonth)
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name, count: p.checkInsThisMonth }));

  const recentlyAdded = [...patientsForClient]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name, daysAgo: daysSince(new Date(p.createdAt)) }));

  return (
    <PatientsManager
      initialPatients={patientsForClient}
      classTemplates={classTemplates.map((c) => ({ id: c.id, label: c.label }))}
      statusCounts={{ actief: statusCounts.actief, pauze: statusCounts.pauze, inactief: statusCounts.inactief }}
      overduePatients={overduePatients}
      topAttenders={topAttenders}
      recentlyAdded={recentlyAdded}
    />
  );
}
