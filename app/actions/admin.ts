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
  classTemplateIds: string[]
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
  classTemplateIds: string[]
) {
  await requireAdmin();
  if (!name.trim()) {
    return { ok: false, error: "Naam is verplicht." };
  }
  await prisma.$transaction([
    prisma.patient.update({
      where: { id: patientId },
      data: { name: name.trim(), skinTone, hairStyle, hairColor },
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

export async function togglePatientActive(patientId: string, active: boolean) {
  await requireAdmin();
  await prisma.patient.update({ where: { id: patientId }, data: { active } });
  revalidatePath("/admin/patients");
  return { ok: true };
}

export async function deletePatient(patientId: string) {
  await requireAdmin();
  await prisma.patient.delete({ where: { id: patientId } });
  revalidatePath("/admin/patients");
  return { ok: true };
}
