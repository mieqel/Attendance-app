import { prisma } from "@/lib/prisma";
import { startOfAmsterdamWeek, startOfAmsterdamMonth, getAmsterdamMonthKey } from "@/lib/currentClass";
import { getLastNMonths } from "@/lib/monthGrid";
import AvatarSvg from "../../../../AvatarSvg";
import Link from "next/link";
import { notFound } from "next/navigation";

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
    },
  });

  if (!patient) notFound();

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
          <h1 className="font-display text-3xl font-semibold text-ink">{patient.name}</h1>
          <p className="text-ink-muted">
            Ingeschreven voor {patient.classes.map((c) => c.classTemplate.label).join(", ") || "geen lessen"}
          </p>
        </div>
      </div>

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
        <div className="grid grid-cols-4 gap-2">
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

      <div>
        <h2 className="font-display text-xl font-semibold text-ink mb-3">Geschiedenis</h2>
        <div className="bg-surface border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {patient.checkIns.length === 0 ? (
            <p className="p-6 text-ink-muted">Nog geen check-ins.</p>
          ) : (
            patient.checkIns.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-ink">{c.classSession.classTemplate.label}</p>
                  <p className="text-sm text-ink-muted">{c.classSession.date}</p>
                </div>
                <span className="text-xl" aria-label="Ingecheckt">
                  ✅
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
