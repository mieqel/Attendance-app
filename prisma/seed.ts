import { PrismaClient } from "@prisma/client";
import { SCHEDULE } from "../lib/schedule";

const prisma = new PrismaClient();

async function main() {
  for (const entry of SCHEDULE) {
    const existing = await prisma.classTemplate.findFirst({
      where: {
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
      },
    });
    if (existing) {
      console.log(`Bestaat al: ${entry.label}`);
      continue;
    }
    await prisma.classTemplate.create({
      data: {
        label: entry.label,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
      },
    });
    console.log(`Aangemaakt: ${entry.label}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
