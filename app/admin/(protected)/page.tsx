import { prisma } from "@/lib/prisma";
import { getAmsterdamNow } from "@/lib/time";
import { getAmsterdamDateKey } from "@/lib/currentClass";
import { SCHEDULE, DAY_NAMES_NL } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { dayOfWeek } = getAmsterdamNow();
  const dateKey = getAmsterdamDateKey();
  const todaysClasses = SCHEDULE.filter((s) => s.dayOfWeek === dayOfWeek);

  const totalPatients = await prisma.patient.count({ where: { active: true } });

  const rows = await Promise.all(
    todaysClasses.map(async (entry) => {
      const template = await prisma.classTemplate.findFirst({
        where: { dayOfWeek: entry.dayOfWeek, startTime: entry.startTime, endTime: entry.endTime },
        include: { patients: true },
      });
      if (!template) return { entry, enrolled: 0, checkedIn: 0 };
      const session = await prisma.classSession.findUnique({
        where: { classTemplateId_date: { classTemplateId: template.id, date: dateKey } },
        include: { checkIns: true },
      });
      return {
        entry,
        enrolled: template.patients.length,
        checkedIn: session?.checkIns.length ?? 0,
      };
    })
  );

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink mb-1">Overzicht</h1>
        <p className="text-ink-muted">
          Vandaag is het {DAY_NAMES_NL[dayOfWeek]} · {totalPatients} actieve cliënten
        </p>
      </div>

      <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-ink-muted">Vandaag zijn er geen lessen.</p>
        ) : (
          rows.map((row) => (
            <div key={row.entry.label} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-semibold text-ink">
                  {row.entry.startTime} - {row.entry.endTime}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-semibold text-teal-dark">
                  {row.checkedIn} / {row.enrolled}
                </p>
                <p className="text-xs text-ink-muted uppercase tracking-wide">ingecheckt</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
