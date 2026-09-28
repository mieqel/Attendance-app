import { prisma } from "@/lib/prisma";
import { startOfAmsterdamWeek, startOfAmsterdamMonth, getAmsterdamMonthKey } from "@/lib/currentClass";
import { getLastNMonths } from "@/lib/monthGrid";
import { attendanceClock, overdueText } from "@/lib/attendance";
import AvatarSvg from "../../../../AvatarSvg";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddPastCheckIn, HistoryList } from "./ManualCheckIn";

export const dynamic = "force-dynamic";

export default async function PatientHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      classes: { include: { classTemplate: true } },
      checkIns: {
        include: { classSession: { include: { classTemplate: true } } },
        orderBy: { checkedInAt: "desc" },
      },
      absences: { orderBy: { date: "desc" } },
    },
  });

  if (!patient) notFound();

  const allClasses = await prisma.classTemplate.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const lastCheckIn = patient.checkIns[0]?.checkedInAt ?? null;
  const clock = attendanceClock({
    status: patient.status,
    createdAt: patient.createdAt,
    lastCheckIn,
    lastExcusedDate: patient.absences[0]?.date ?? null,
    pauseUntil: patient.pauseUntil,
  });
  const overdue = clock.overdue;

  // Check-ins and excused absences in one list, newest first.
  const history = [
    ...patient.checkIns.map((c) => ({
      kind: "checkIn" as const,
      id: c.id,
      date: c.classSession.date,
      label: c.classSession.classTemplate.label,
    })),
    ...patient.absences.map((a) => ({ kind: "absence" as const, id: a.id, date: a.date, label: a.reason })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const monthCounts = new Map<string, number>();
  for (const c of patient.checkIns) {
    const key = getAmsterdamMonthKey(c.checkedInAt);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  const months = getLastNMonths(12);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Link href="/admin/patients" className="text-ink-muted hover:text-teal font-medium text-sm">
        ← Terug naar cliënten
      </Link>

      <div className="flex items-center gap-4">
        <AvatarSvg skinTone={patient.skinTone} hairStyle={patient.hairStyle} hairColor={patient.hairColor} seed={patient.id} size={72} />
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-ink">{patient.name}</h1>
          <p className="text-ink-muted">
            Ingeschreven voor {patient.classes.map((c) => c.classTemplate.label).join(", ") || "geen lessen"}
          </p>
        </div>
      </div>

      {overdue && (
        <div
          className="border-2 border-danger text-danger rounded-2xl px-4 py-3 font-semibold"
          style={{ backgroundColor: "rgba(179, 69, 47, 0.08)" }}
        >
          {overdueText(clock)}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-2xl p-4">
          <p className="font-display text-2xl font-semibold text-teal-dark mb-1">
            {patient.checkIns.filter((c) => c.checkedInAt >= startOfAmsterdamWeek()).length}
          </p>
          <p className="text-ink-muted text-xs uppercase tracking-wide">deze week</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-4">
          <p className="font-display text-2xl font-semibold text-teal-dark mb-1">
            {patient.checkIns.filter((c) => c.checkedInAt >= startOfAmsterdamMonth()).length}
          </p>
          <p className="text-ink-muted text-xs uppercase tracking-wide">deze maand</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-4">
          <p className="font-display text-2xl font-semibold text-teal-dark mb-1">{patient.checkIns.length}</p>
          <p className="text-ink-muted text-xs uppercase tracking-wide">totaal</p>
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold text-ink mb-3">Maandoverzicht</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {months.map((m) => {
            const count = monthCounts.get(m.key) ?? 0;
            const attended = count > 0;
            return (
              <div
                key={m.key}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-3 ${
                  attended ? "bg-teal/10 border-teal" : "bg-surface-muted border-border"
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    attended ? "bg-teal text-white" : "bg-border text-ink-muted"
                  }`}
                >
                  {attended ? count : "–"}
                </span>
                <span className="text-xs font-medium text-ink-muted capitalize">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink">Geschiedenis</h2>
          <AddPastCheckIn patientId={patient.id} classes={allClasses} />
        </div>
        <HistoryList patientId={patient.id} items={history} />
      </div>
    </div>
  );
}
