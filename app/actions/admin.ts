"use server";

import { prisma } from "@/lib/prisma";
import { createAdminSession, destroyAdminSession, isAdminAuthenticated } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAbsenceReason } from "@/lib/attendance";

export async function login(pin: string) {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    return { ok: false, error: "ADMIN_PIN is niet ingesteld op de server." };
  }
  if (pin !== adminPin) {
    return { ok: false, error: "Onjuiste pincode." };
  }
  await createAdminSession();
  return { ok: true };
}

export async function logout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

async function requireAdmin() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    redirect("/admin/login");
  }
}

export async function createPatient(
  name: string,
  skinTone: string,
  hairStyle: string,
  hairColor: string,
  classTemplateIds: string[],
  status: string = "actief"
) {
  await requireAdmin();
  if (!name.trim()) {
    return { ok: false, error: "Naam is verplicht." };
  }
  await prisma.patient.create({
    data: {
      name: name.trim(),
      skinTone,
      hairStyle,
      hairColor,
      status,
      active: status !== "inactief",
      classes: {
        create: classTemplateIds.map((id) => ({ classTemplateId: id })),
      },
    },
  });
  revalidatePath("/admin/patients");
  return { ok: true };
}

export async function updatePatient(
  patientId: string,
  name: string,
  skinTone: string,
  hairStyle: string,
  hairColor: string,
  classTemplateIds: string[],
  status: string = "actief",
  pauseUntil: string | null = null
) {
  await requireAdmin();
  if (!name.trim()) {
    return { ok: false, error: "Naam is verplicht." };
  }
  if (pauseUntil !== null && !/^\d{4}-\d{2}-\d{2}$/.test(pauseUntil)) {
    return { ok: false, error: "Ongeldige terugkeerdatum." };
  }
  const pauseData = await pauseFieldsFor(patientId, status, pauseUntil);

  // Only touch the rows that actually changed, instead of deleting and
  // recreating every PatientClass row on every save. Keeps history-minded
  // metadata (e.g. a future "enrolled since" column) intact for classes
  // the patient was already in, and avoids needless churn for classes
  // that didn't change at all.
  const current = await prisma.patientClass.findMany({
    where: { patientId },
    select: { classTemplateId: true },
  });
  const currentIds: Set<string> = new Set(current.map((c: { classTemplateId: string }) => c.classTemplateId));
  const nextIds: Set<string> = new Set(classTemplateIds);
  const toAdd: string[] = classTemplateIds.filter((id) => !currentIds.has(id));
  const toRemove: string[] = Array.from(currentIds).filter((id) => !nextIds.has(id));

  await prisma.$transaction([
    prisma.patient.update({
      where: { id: patientId },
      data: { name: name.trim(), skinTone, hairStyle, hairColor, status, active: status !== "inactief", ...pauseData },
    }),
    ...(toRemove.length > 0
      ? [prisma.patientClass.deleteMany({ where: { patientId, classTemplateId: { in: toRemove } } })]
      : []),
    ...(toAdd.length > 0
      ? [prisma.patientClass.createMany({ data: toAdd.map((id) => ({ patientId, classTemplateId: id })) })]
      : []),
  ]);
  revalidatePath("/admin/patients");
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true };
}

// Replaces the old active/inactive-only toggle with a three-way status.
export async function setPatientStatus(patientId: string, status: string) {
  await requireAdmin();
  if (!["actief", "pauze", "inactief"].includes(status)) {
    return { ok: false, error: "Ongeldige status." };
  }
  const pauseData = await pauseFieldsFor(patientId, status, null);
  await prisma.patient.update({
    where: { id: patientId },
    data: { status, active: status !== "inactief", ...pauseData },
  });
  revalidatePath("/admin/patients");
  revalidatePath("/admin");
  return { ok: true };
}

// How pauseUntil changes along with the status:
//  - pauze with a return date  -> store it (auto-back to actief that day)
//  - pauze without a date      -> open-ended pause
//  - pauze -> actief by hand   -> "pause ended now", so the Aandacht-nodig
//                                 clock doesn't instantly flag them
//  - anything else             -> leave as is
async function pauseFieldsFor(patientId: string, status: string, pauseUntil: string | null) {
  if (status === "pauze") {
    return { pauseUntil: pauseUntil ? new Date(`${pauseUntil}T00:00:00Z`) : null };
  }
  const prev = await prisma.patient.findUnique({ where: { id: patientId }, select: { status: true } });
  if (prev?.status === "pauze" && status === "actief") return { pauseUntil: new Date() };
  return {};
}

export async function deletePatient(patientId: string) {
  await requireAdmin();
  await prisma.patient.delete({ where: { id: patientId } });
  revalidatePath("/admin/patients");
  return { ok: true };
}

// Lets an admin backfill check-ins for one or more dates that already
// happened — e.g. a patient was actually there but the tablet was missed
// across several sessions. Reuses the same upsert pattern as the kiosk
// check-in so manual entries are indistinguishable from real ones.
export async function addManualCheckIn(patientId: string, classTemplateId: string, dates: string[]) {
  await requireAdmin();
  const validDates = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (validDates.length === 0) {
    return { ok: false, error: "Kies minstens één geldige datum." };
  }

  for (const date of validDates) {
    const session = await prisma.classSession.upsert({
      where: {
        classTemplateId_date: { classTemplateId, date },
      },
      update: {},
      create: { classTemplateId, date },
    });

    await prisma.checkIn.upsert({
      where: {
        patientId_classSessionId: { patientId, classSessionId: session.id },
      },
      update: {},
      create: { patientId, classSessionId: session.id, checkedInAt: backfillTimestamp(date) },
    });
  }

  revalidatePath(`/admin/patients/${patientId}`);
  revalidatePath("/admin/patients");
  revalidatePath("/admin");
  return { ok: true };
}

// A backfilled check-in used to get checkedInAt = now(), which made a
// missed day from weeks ago count as "this week" and reset the
// "last seen" / overdue logic. Stamp it on the actual session day instead
// (10:00 UTC = midday in Amsterdam, so it never slips to another date).
function backfillTimestamp(date: string): Date {
  const stamp = new Date(`${date}T10:00:00Z`);
  return stamp.getTime() > Date.now() ? new Date() : stamp;
}

export type AttendanceEntry = {
  id: string;
  date: string; // "YYYY-MM-DD"
  classTemplateId: string;
  label: string;
};
export type AbsenceEntry = { date: string; reason: string };
export type PatientAttendance = { checkIns: AttendanceEntry[]; absences: AbsenceEntry[] };

// Everything the inline attendance calendar in the cliënt drawer needs.
export async function getPatientAttendance(patientId: string): Promise<PatientAttendance> {
  await requireAdmin();
  const [rows, absences] = await Promise.all([
    prisma.checkIn.findMany({
      where: { patientId },
      select: {
        id: true,
        classSession: { select: { date: true, classTemplateId: true, classTemplate: { select: { label: true } } } },
      },
    }),
    prisma.absence.findMany({ where: { patientId }, select: { date: true, reason: true } }),
  ]);
  return {
    checkIns: rows
      .map((r) => ({
        id: r.id,
        date: r.classSession.date,
        classTemplateId: r.classSession.classTemplateId,
        label: r.classSession.classTemplate.label,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
    absences,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function checkInOn(patientId: string, classTemplateId: string, date: string) {
  const session = await prisma.classSession.upsert({
    where: { classTemplateId_date: { classTemplateId, date } },
    update: {},
    create: { classTemplateId, date },
  });
  await prisma.checkIn.upsert({
    where: { patientId_classSessionId: { patientId, classSessionId: session.id } },
    update: {},
    create: { patientId, classSessionId: session.id, checkedInAt: backfillTimestamp(date) },
  });
  // Present and "afgemeld" on the same day can't both be true.
  await prisma.absence.deleteMany({ where: { patientId, date } });
}

function revalidateAttendance(patientId: string) {
  revalidatePath(`/admin/patients/${patientId}`);
  revalidatePath("/admin/patients");
  revalidatePath("/admin");
}

// One round trip for the calendar's "Opslaan": check-ins and absences
// added/removed together, then the fresh state comes back so the drawer
// redraws without a page reload.
export async function saveAttendanceChanges(
  patientId: string,
  changes: {
    addCheckIns: { date: string; classTemplateId: string }[];
    removeCheckInIds: string[];
    addAbsences: { date: string; reason: string }[];
    removeAbsenceDates: string[];
  }
): Promise<{ ok: true; data: PatientAttendance } | { ok: false; error: string }> {
  await requireAdmin();
  const { addCheckIns, removeCheckInIds, addAbsences, removeAbsenceDates } = changes;
  if (addCheckIns.some((e) => !DATE_RE.test(e.date) || !e.classTemplateId)) {
    return { ok: false, error: "Een of meer datums zijn ongeldig." };
  }
  if (addAbsences.some((a) => !DATE_RE.test(a.date) || !isAbsenceReason(a.reason))) {
    return { ok: false, error: "Ongeldige reden of datum." };
  }

  if (removeCheckInIds.length > 0) {
    // patientId in the where-clause so an id from another patient can't be removed here.
    await prisma.checkIn.deleteMany({ where: { id: { in: removeCheckInIds }, patientId } });
  }
  if (removeAbsenceDates.length > 0) {
    await prisma.absence.deleteMany({ where: { patientId, date: { in: removeAbsenceDates } } });
  }
  for (const { date, classTemplateId } of addCheckIns) {
    await checkInOn(patientId, classTemplateId, date);
  }
  for (const { date, reason } of addAbsences) {
    await prisma.absence.upsert({
      where: { patientId_date: { patientId, date } },
      update: { reason },
      create: { patientId, date, reason },
    });
  }

  revalidateAttendance(patientId);
  return { ok: true, data: await getPatientAttendance(patientId) };
}

// ---- Presentielijst: one class on one date ----

export type RosterRow = {
  patientId: string;
  name: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  status: string;
  enrolled: boolean; // false = drop-in who checked in anyway
  present: boolean;
  absence: string | null;
};

export async function getSessionRoster(classTemplateId: string, date: string): Promise<RosterRow[]> {
  await requireAdmin();
  if (!DATE_RE.test(date)) return [];
  const template = await prisma.classTemplate.findUnique({
    where: { id: classTemplateId },
    include: { patients: { include: { patient: true } } },
  });
  if (!template) return [];
  const session = await prisma.classSession.findUnique({
    where: { classTemplateId_date: { classTemplateId, date } },
    include: { checkIns: { include: { patient: true } } },
  });

  const presentIds = new Set((session?.checkIns ?? []).map((c) => c.patientId));
  const people = new Map<string, { p: (typeof template.patients)[number]["patient"]; enrolled: boolean }>();
  for (const pc of template.patients) {
    // Inactive clients drop off the list unless they actually showed up.
    if (pc.patient.status === "inactief" && !presentIds.has(pc.patientId)) continue;
    people.set(pc.patientId, { p: pc.patient, enrolled: true });
  }
  for (const c of session?.checkIns ?? []) {
    if (!people.has(c.patientId)) people.set(c.patientId, { p: c.patient, enrolled: false });
  }

  const ids = Array.from(people.keys());
  const absences = await prisma.absence.findMany({ where: { date, patientId: { in: ids } } });
  const absenceBy = new Map(absences.map((a) => [a.patientId, a.reason]));

  return Array.from(people.values())
    .map(({ p, enrolled }) => ({
      patientId: p.id,
      name: p.name,
      skinTone: p.skinTone,
      hairStyle: p.hairStyle,
      hairColor: p.hairColor,
      status: p.status,
      enrolled,
      present: presentIds.has(p.id),
      absence: absenceBy.get(p.id) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

// Tap on a name in the presentielijst: mark present / not present.
export async function setSessionPresence(patientId: string, classTemplateId: string, date: string, present: boolean) {
  await requireAdmin();
  if (!DATE_RE.test(date)) return { ok: false, error: "Ongeldige datum." };
  if (present) {
    await checkInOn(patientId, classTemplateId, date);
  } else {
    const session = await prisma.classSession.findUnique({
      where: { classTemplateId_date: { classTemplateId, date } },
    });
    if (session) await prisma.checkIn.deleteMany({ where: { patientId, classSessionId: session.id } });
  }
  revalidateAttendance(patientId);
  return { ok: true };
}

// Reason for not being there (or null to clear it).
export async function setAbsence(patientId: string, date: string, reason: string | null, classTemplateId?: string) {
  await requireAdmin();
  if (!DATE_RE.test(date)) return { ok: false, error: "Ongeldige datum." };
  if (reason === null) {
    await prisma.absence.deleteMany({ where: { patientId, date } });
  } else {
    if (!isAbsenceReason(reason)) return { ok: false, error: "Ongeldige reden." };
    await prisma.absence.upsert({
      where: { patientId_date: { patientId, date } },
      update: { reason, classTemplateId: classTemplateId ?? null },
      create: { patientId, date, reason, classTemplateId: classTemplateId ?? null },
    });
  }
  revalidateAttendance(patientId);
  return { ok: true };
}

// Undo a check-in (manual or real) — for correcting mistakes after the fact.
export async function removeCheckIn(checkInId: string, patientId: string) {
  await requireAdmin();
  await prisma.checkIn.deleteMany({ where: { id: checkInId, patientId } });
  revalidateAttendance(patientId);
  return { ok: true };
}

export async function createClass(label: string, dayOfWeek: number, startTime: string, endTime: string) {
  await requireAdmin();
  if (!label.trim()) {
    return { ok: false, error: "Naam is verplicht." };
  }
  await prisma.classTemplate.create({
    data: { label: label.trim(), dayOfWeek, startTime, endTime },
  });
  revalidatePath("/admin/classes");
  return { ok: true };
}

export async function updateClass(
  id: string,
  label: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
) {
  await requireAdmin();
  if (!label.trim()) {
    return { ok: false, error: "Naam is verplicht." };
  }
  await prisma.classTemplate.update({
    where: { id },
    data: { label: label.trim(), dayOfWeek, startTime, endTime },
  });
  revalidatePath("/admin/classes");
  return { ok: true };
}

export async function deleteClass(id: string) {
  await requireAdmin();
  await prisma.classTemplate.delete({ where: { id } });
  revalidatePath("/admin/classes");
  return { ok: true };
}

// Enrolls one patient in one class — used by the roster drawer on the
// Lessen page. Upsert so a duplicate click (e.g. a double-tap) is a no-op
// instead of a unique-constraint error.
export async function addPatientToClass(patientId: string, classTemplateId: string) {
  await requireAdmin();
  await prisma.patientClass.upsert({
    where: { patientId_classTemplateId: { patientId, classTemplateId } },
    update: {},
    create: { patientId, classTemplateId },
  });
  revalidatePath("/admin/classes");
  revalidatePath("/admin/patients");
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true };
}

// Removes one patient from one class — the other half of the roster
// drawer. deleteMany rather than delete so removing someone who's already
// gone (e.g. two admins acting at once) doesn't throw.
export async function removePatientFromClass(patientId: string, classTemplateId: string) {
  await requireAdmin();
  await prisma.patientClass.deleteMany({ where: { patientId, classTemplateId } });
  revalidatePath("/admin/classes");
  revalidatePath("/admin/patients");
  revalidatePath(`/admin/patients/${patientId}`);
  return { ok: true };
}
