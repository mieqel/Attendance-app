import { prisma } from "@/lib/prisma";
import { getAmsterdamNow } from "@/lib/time";
import { getAmsterdamDateKey, getAmsterdamMonthKey } from "@/lib/currentClass";
import { getCurrentClass, formatWait, toMinutes } from "@/lib/currentClass";
import { DAY_NAMES_NL } from "@/lib/schedule";
import { getLastNMonths } from "@/lib/monthGrid";
import {
  getOverduePatients,
  getStatusCounts,
  getWeeklyCheckInTrend,
} from "@/lib/insights";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { dayOfWeek, minutesSinceMidnight } = getAmsterdamNow();
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

  // ---- widget data ----
  const [current, weeklyTrend, overduePatients, statusCounts, totalClassSlots] = await Promise.all([
    getCurrentClass(),
    getWeeklyCheckInTrend(),
    getOverduePatients(5),
    getStatusCounts(),
    prisma.classTemplate.count(),
  ]);

  const activeRow = current.active ? rows.find((r) => r.entry.id === current.active!.id) : undefined;
  const activeProgressPct = current.active
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((minutesSinceMidnight - toMinutes(current.active.startTime)) /
              (toMinutes(current.active.endTime) - toMinutes(current.active.startTime))) *
              100
          )
        )
      )
    : 0;

  const avgBezetting =
    rows.length > 0
      ? Math.round(
          (rows.reduce((sum, r) => sum + (r.enrolled > 0 ? r.checkedIn / r.enrolled : 0), 0) / rows.length) * 100
        )
      : null;

  const statusTotal = statusCounts.actief + statusCounts.pauze + statusCounts.inactief || 1;
  const donut = [
    { key: "actief", label: "actief", count: statusCounts.actief, color: "#1f6d3f" },
    { key: "pauze", label: "op pauze", count: statusCounts.pauze, color: "#f8c944" },
    { key: "inactief", label: "inactief", count: statusCounts.inactief, color: "#8f1620" },
  ];
  let cursor = 0;
  const donutSegments = donut.map((d) => {
    const pct = (d.count / statusTotal) * 100;
    const seg = { ...d, pct, offset: -cursor };
    cursor += pct;
    return seg;
  });

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,760px)_1fr] lg:items-start">
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink mb-1">Overzicht</h1>
            <p className="text-ink-muted">
              Vandaag is het {DAY_NAMES_NL[dayOfWeek]} · {totalPatients} actieve cliënten
            </p>
          </div>
          <PrintButton />
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

      {/* Widget rail */}
      <div className="flex flex-col gap-5 print:hidden">
        {/* Volgende les */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink text-sm mb-3">Volgende les</h3>
          {current.active ? (
            <div className="rounded-xl p-4 text-white bg-gradient-to-br from-teal to-teal-dark">
              <p className="text-[11px] uppercase tracking-wide opacity-85">Nu bezig</p>
              <p className="font-display text-xl font-semibold my-0.5">
                {current.active.startTime} – {current.active.endTime}
              </p>
              <p className="text-xs opacity-90">
                {activeRow ? `${activeRow.checkedIn} van de ${activeRow.enrolled} ingecheckt` : current.active.label}
              </p>
              <div className="bg-white/25 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div className="bg-white h-full rounded-full" style={{ width: `${activeProgressPct}%` }} />
              </div>
            </div>
          ) : current.next ? (
            <div className="rounded-xl p-4 bg-surface-muted">
              <p className="text-[11px] uppercase tracking-wide text-ink-muted">Volgende les</p>
              <p className="font-display text-lg font-semibold text-ink my-0.5">
                {DAY_NAMES_NL[current.next.dayOfWeek]} {current.next.entry.startTime}
              </p>
              <p className="text-xs text-ink-muted">{formatWait(current.next.inMinutes, current.next.dayOfWeek)}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Geen lessen ingepland.</p>
          )}
        </div>

        {/* Deze week in het kort */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink text-sm mb-1">Deze week in het kort</h3>
          <p className="text-xs text-ink-muted mb-3">t.o.v. vorige week</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-surface-muted rounded-xl p-3">
              <p className="font-display text-xl font-semibold text-teal-dark leading-none">{weeklyTrend.thisWeek}</p>
              <p className="text-[11px] text-ink-muted mt-1">check-ins deze week</p>
            </div>
            <div className="bg-surface-muted rounded-xl p-3">
              <p className="font-display text-xl font-semibold text-teal-dark leading-none">{totalClassSlots}</p>
              <p className="text-[11px] text-ink-muted mt-1">lessen per week</p>
            </div>
            <div className="bg-surface-muted rounded-xl p-3">
              <p className="font-display text-xl font-semibold text-teal-dark leading-none">
                {avgBezetting !== null ? `${avgBezetting}%` : "–"}
              </p>
              <p className="text-[11px] text-ink-muted mt-1">gem. bezetting vandaag</p>
            </div>
            <div className="bg-surface-muted rounded-xl p-3">
              <p className="font-display text-xl font-semibold text-teal-dark leading-none">
                {weeklyTrend.changePct === null
                  ? "–"
                  : `${weeklyTrend.changePct > 0 ? "▲" : "▼"} ${Math.abs(weeklyTrend.changePct)}%`}
              </p>
              <p className="text-[11px] text-ink-muted mt-1">t.o.v. vorige week</p>
            </div>
          </div>
        </div>

        {/* Aandacht nodig */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink text-sm mb-1">Aandacht nodig</h3>
          <p className="text-xs text-ink-muted mb-3">Actief, maar lang niet geweest</p>
          {overduePatients.length === 0 ? (
            <p className="text-sm" style={{ color: "#1f6d3f" }}>
              Niemand is momenteel te lang weggebleven.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {overduePatients.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span className="font-semibold text-sm text-ink">{p.name}</span>
                  <span className="text-xs font-medium" style={{ color: "#8f1620" }}>
                    {p.days} dagen
                  </span>
                </div>
              ))}
            </div>
          )}
          <a href="/admin/patients" className="text-xs text-teal-dark font-medium mt-3 inline-block hover:underline">
            Bekijk alle cliënten →
          </a>
        </div>

        {/* Status verdeling */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-ink text-sm mb-3">Status verdeling</h3>
          <div className="flex items-center gap-4">
            <svg width="84" height="84" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="#ecdfdd" strokeWidth="6" />
              {donutSegments.map((s) => (
                <circle
                  key={s.key}
                  cx="21"
                  cy="21"
                  r="15.9"
                  fill="transparent"
                  stroke={s.color}
                  strokeWidth="6"
                  strokeDasharray={`${s.pct} ${100 - s.pct}`}
                  strokeDashoffset={s.offset}
                  transform="rotate(-90 21 21)"
                />
              ))}
            </svg>
            <div className="flex flex-col gap-1.5 text-xs">
              {donutSegments.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                  {s.count} {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
