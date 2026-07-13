import { prisma } from "@/lib/prisma";
import ClassesManager from "./ClassesManager";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const classes = await prisma.classTemplate.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return <ClassesManager initialClasses={classes} />;
}
