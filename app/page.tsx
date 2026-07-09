import { prisma } from "@/lib/prisma";
import { getCurrentClass, getAmsterdamDateKey, formatWait } from "@/lib/currentClass";
import { DAY_NAMES_NL } from "@/lib/schedule";
import { getInitials } from "@/lib/initials";
import KioskClient from "./KioskClient";

export const dynamic = "force-dynamic"; // always compute against the real current time

export default async function KioskPage() {
  const { active, next } = getCurrentClass();

  if (!active) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-6xl">🕓</div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink">
          Er is nu geen les
        </h1>
        {next ? (
          <p className="text-xl text-ink-muted max-w-md">
            De volgende les is <span className="font-semibold text-teal">{DAY_NAMES_NL[next.dayOfWeek]}</span> om{" "}
            <span className="font-semibold text-teal">{next.entry.startTime}</span> —{" "}
            {formatWait(next.inMinutes, next.dayOfWeek)}.
          </p>
        ) : (
          <p className="text-xl text-ink-muted max-w-md">Kom later terug.</p>
        )}
      </main>
    );
  }

  const template = await prisma.classTemplate.findFirst({
    where: {
      dayOfWeek: active.dayOfWeek,
      startTime: active.startTime,
      endTime: active.endTime,
    },
    include: {
      patients: {
        include: { patient: true },
      },
    },
  });

  if (!template) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="font-display text-3xl font-semibold text-ink">Les niet gevonden</h1>
        <p className="text-xl text-ink-muted">Vraag je trainer om dit te controleren.</p>
      </main>
    );
  }

  const dateKey = getAmsterdamDateKey();
  const session = await prisma.classSession.findUnique({
    where: {
      classTemplateId_date: {
        classTemplateId: template.id,
        date: dateKey,
      },
    },
    include: { checkIns: true },
  });

  const checkedInIds = new Set((session?.checkIns ?? []).map((c) => c.patientId));

  const patients = template.patients
    .map((pc) => pc.patient)
    .filter((p) => p.active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({
      id: p.id,
      initials: getInitials(p.name),
      skinTone: p.skinTone,
      hairStyle: p.hairStyle,
      hairColor: p.hairColor,
      checkedIn: checkedInIds.has(p.id),
    }));

  return <KioskClient classLabel={active.label} patients={patients} />;
}
