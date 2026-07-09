"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentClass, getAmsterdamDateKey } from "@/lib/currentClass";
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from "@/lib/avatar";
import { revalidatePath } from "next/cache";

// Finds (or lazily creates) today's ClassSession for the class that is
// currently active, and records a check-in for the given patient.
// A single tap on their avatar is all it takes — this is intentionally the
// entire interaction, no confirmation step.
export async function checkInPatient(patientId: string) {
  const { active } = getCurrentClass();
  if (!active) {
    return { ok: false, error: "Er is nu geen les. Vraag je trainer om hulp." };
  }

  const template = await prisma.classTemplate.findFirst({
    where: {
      dayOfWeek: active.dayOfWeek,
      startTime: active.startTime,
      endTime: active.endTime,
    },
  });

  if (!template) {
    return { ok: false, error: "Les niet gevonden. Vraag je trainer om hulp." };
  }

  const belongs = await prisma.patientClass.findUnique({
    where: {
      patientId_classTemplateId: {
        patientId,
        classTemplateId: template.id,
      },
    },
  });

  if (!belongs) {
    return { ok: false, error: "Je staat niet op de lijst voor deze les. Vraag je trainer om hulp." };
  }

  const dateKey = getAmsterdamDateKey();

  const session = await prisma.classSession.upsert({
    where: {
      classTemplateId_date: {
        classTemplateId: template.id,
        date: dateKey,
      },
    },
    update: {},
    create: {
      classTemplateId: template.id,
      date: dateKey,
    },
  });

  await prisma.checkIn.upsert({
    where: {
      patientId_classSessionId: {
        patientId,
        classSessionId: session.id,
      },
    },
    update: {},
    create: {
      patientId,
      classSessionId: session.id,
    },
  });

  revalidatePath("/");
  return { ok: true };
}

// Undo an accidental check-in. Elderly users often mis-tap on shared tablets,
// so this needs to be just as easy as checking in — same class/session lookup,
// just deletes instead of creates.
export async function checkOutPatient(patientId: string) {
  const { active } = getCurrentClass();
  if (!active) {
    return { ok: false, error: "Er is nu geen les." };
  }

  const template = await prisma.classTemplate.findFirst({
    where: {
      dayOfWeek: active.dayOfWeek,
      startTime: active.startTime,
      endTime: active.endTime,
    },
  });
  if (!template) {
    return { ok: false, error: "Les niet gevonden." };
  }

  const dateKey = getAmsterdamDateKey();
  const session = await prisma.classSession.findUnique({
    where: {
      classTemplateId_date: {
        classTemplateId: template.id,
        date: dateKey,
      },
    },
  });
  if (!session) {
    return { ok: true }; // nothing to undo
  }

  await prisma.checkIn.deleteMany({
    where: { patientId, classSessionId: session.id },
  });

  revalidatePath("/");
  return { ok: true };
}

export async function updatePatientAppearance(
  patientId: string,
  skinTone: string,
  hairStyle: string,
  hairColor: string
) {
  const validSkin = SKIN_TONES.some((s) => s.key === skinTone);
  const validHairStyle = HAIR_STYLES.some((h) => h.key === hairStyle);
  const validHairColor = HAIR_COLORS.some((h) => h.key === hairColor);
  if (!validSkin || !validHairStyle || !validHairColor) {
    return { ok: false, error: "Ongeldige keuze." };
  }
  await prisma.patient.update({
    where: { id: patientId },
    data: { skinTone, hairStyle, hairColor },
  });
  revalidatePath("/");
  return { ok: true };
}

// Lets someone who isn't on the list yet add themselves to the class that is
// currently active, right from the kiosk — no admin needed. They're checked
// in immediately since they're already there.
export async function registerPatient(
  name: string,
  skinTone: string,
  hairStyle: string,
  hairColor: string
) {
  if (!name.trim()) {
    return { ok: false, error: "Naam is verplicht." };
  }
  const validSkin = SKIN_TONES.some((s) => s.key === skinTone);
  const validHairStyle = HAIR_STYLES.some((h) => h.key === hairStyle);
  const validHairColor = HAIR_COLORS.some((h) => h.key === hairColor);
  if (!validSkin || !validHairStyle || !validHairColor) {
    return { ok: false, error: "Ongeldige keuze." };
  }

  const { active } = getCurrentClass();
  if (!active) {
    return { ok: false, error: "Er is nu geen les." };
  }

  const template = await prisma.classTemplate.findFirst({
    where: {
      dayOfWeek: active.dayOfWeek,
      startTime: active.startTime,
      endTime: active.endTime,
    },
  });
  if (!template) {
    return { ok: false, error: "Les niet gevonden. Vraag je trainer om hulp." };
  }

  const patient = await prisma.patient.create({
    data: {
      name: name.trim(),
      skinTone,
      hairStyle,
      hairColor,
      classes: { create: [{ classTemplateId: template.id }] },
    },
  });

  const dateKey = getAmsterdamDateKey();
  const session = await prisma.classSession.upsert({
    where: {
      classTemplateId_date: {
        classTemplateId: template.id,
        date: dateKey,
      },
    },
    update: {},
    create: {
      classTemplateId: template.id,
      date: dateKey,
    },
  });

  await prisma.checkIn.create({
    data: { patientId: patient.id, classSessionId: session.id },
  });

  revalidatePath("/");
  return { ok: true };
}
