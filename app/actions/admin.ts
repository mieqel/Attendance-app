"use server";

import { prisma } from "@/lib/prisma";
import { createAdminSession, destroyAdminSession, isAdminAuthenticated } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  status: string = "actief"
) {
  await requireAdmin();
  if (!name.trim()) {
    return { ok: false, error: "Naam is verplicht." };
  }
  await prisma.$transaction([
    prisma.patient.update({
      where: { id: patientId },
      data: { name: name.trim(), skinTone, hairStyle, hairColor, status, active: status !== "inactief" },
    }),
    prisma.patientClass.deleteMany({ where: { patientId } }),
    prisma.patientClass.createMany({
      data: classTemplateIds.map((id) => ({ patientId, classTemplateId: id })),
    }),
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
  await prisma.patient.update({
    where: { id: patientId },
    data: { status, active: status !== "inactief" },
  });
  revalidatePath("/admin/patients");
  return { ok: true };
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
      create: { patientId, classSessionId: session.id },
    });
  }

  revalidatePath(`/admin/patients/${patientId}`);
  revalidatePath("/admin");
  return { ok: true };
}

// Undo a check-in (manual or real) — for correcting mistakes after the fact.
export async function removeCheckIn(checkInId: string, patientId: string) {
  await requireAdmin();
  await prisma.checkIn.delete({ where: { id: checkInId } });
  revalidatePath(`/admin/patients/${patientId}`);
  revalidatePath("/admin");
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
