import { prisma } from "@/lib/prisma";
import { startOfAmsterdamWeek, startOfAmsterdamMonth } from "@/lib/currentClass";
import { daysSince } from "@/lib/attendance";
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
      active: p.active,
      classTemplateIds: p.classes.map((c) => c.classTemplateId),
      checkInsThisWeek: p.checkIns.filter((c) => c.checkedInAt >= weekStart).length,
      checkInsThisMonth: p.checkIns.filter((c) => c.checkedInAt >= monthStart).length,
      daysSinceLastCheckIn: lastCheckIn ? daysSince(lastCheckIn) : null,
    };
  });

  return (
    <PatientsManager
      initialPatients={patientsForClient}
      classTemplates={classTemplates.map((c) => ({ id: c.id, label: c.label }))}
    />
  );
}
