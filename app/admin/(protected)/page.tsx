import { prisma } from "@/lib/prisma";
import { getAmsterdamNow } from "@/lib/time";
import { getAmsterdamDateKey, getAmsterdamMonthKey } from "@/lib/currentClass";
import { DAY_NAMES_NL } from "@/lib/schedule";
import { getLastNMonths } from "@/lib/monthGrid";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { dayOfWeek } = getAmsterdamNow();
  const dateKey = getAmsterdamDateKey();

  const totalPatients = await prisma.patient.count({ where: { active: true } });

  const todaysClasses = await prisma.classTemplate.findMany({
    where: { dayOfWeek },
    include: { patients: true },
    orderBy: { startTime: "asc" },
  });

  const rows = await Promise.all(
    todaysClasses.map(async (template) => {
      const session = await prisma.classSession.findUnique({
        where: { classTemplateId_date: { classTemplateId: template.id, date: dateKey } },
        include: { checkIns: true },
      });
      return {
        entry: template,
        enrolled: template.patients.length,
        checkedIn: session?.checkIns.length ?? 0,
      };
    })
  );

  // Clinic-wide monthly attendance for the trend chart — every check-in
  // from the last 6 months, bucketed by month. Useful for spotting overall
  // dips (e.g. a summer slump) rather than just one patient's pattern.
  const months = getLastNMonths(6);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentCheckIns = await prisma.checkIn.findMany({
    where: { checkedInAt: { gte: sixMonthsAgo } },
    select: { checkedInAt: true },
  });
  const monthCounts = new Map<string, number>();
  for (const c of recentCheckIns) {
    const key = getAmsterdamMonthKey(c.checkedInAt);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  const chartData = months.map((m) => ({ label: m.label, count: monthCounts.get(m.key) ?? 0 }));
  const maxCount = Math.max(1, ...chartData.map((m) => m.count));

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

      <div>
        <h2 className="font-display text-xl font-semibold text-ink mb-3">Aanwezigheid per maand</h2>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-end gap-3" style={{ height: 140 }}>
            {chartData.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-xs font-semibold text-teal-dark mb-1">{m.count}</span>
                <div
                  className="w-full bg-amber rounded-t"
                  style={{ height: `${Math.round((m.count / maxCount) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-2">
            {chartData.map((m) => (
              <div key={m.label} className="flex-1 text-center text-xs text-ink-muted font-medium capitalize">
                {m.label.split(" ")[0]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
